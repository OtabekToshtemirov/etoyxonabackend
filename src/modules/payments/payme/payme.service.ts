import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { VenuePaymentSettings } from '../entities/venue-payment-settings.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { nextPaymentNumber } from '../../../common/utils/sequence.util';

/**
 * Payme Merchant API integratsiyasi (per-venue)
 * 
 * Har bir to'yxona o'z Payme merchant kalitlarini kiritadi.
 * Pul to'g'ridan-to'g'ri shu to'yxonaning Payme hisobiga tushadi.
 * 
 * To'yxona egasi Settings sahifasida:
 *   1. payme_merchant_id kiritadi
 *   2. payme_merchant_key kiritadi
 *   3. paymeEnabled = true qiladi
 * 
 * Keyin to'lov qilish mumkin bo'ladi.
 */
@Injectable()
export class PaymeService {
  private readonly logger = new Logger(PaymeService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(VenuePaymentSettings)
    private readonly settingsRepo: Repository<VenuePaymentSettings>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Shu venue uchun Payme sozlangan yoki yo'qligini tekshirish
   */
  async isConfiguredForVenue(venueId: string): Promise<boolean> {
    const settings = await this.settingsRepo.findOne({ where: { venueId } });
    return !!(settings?.paymeEnabled && settings?.paymeMerchantId && settings?.paymeMerchantKey);
  }

  private async getVenueSettings(venueId: string): Promise<VenuePaymentSettings> {
    const settings = await this.settingsRepo.findOne({ where: { venueId } });
    if (!settings || !settings.paymeEnabled || !settings.paymeMerchantId || !settings.paymeMerchantKey) {
      throw new BadRequestException(
        'Payme integratsiya sozlanmagan. Settings sahifasida Payme merchant kalitlarini kiriting.',
      );
    }
    return settings;
  }

  private getCheckoutUrl(testMode: boolean): string {
    return testMode
      ? 'https://checkout.test.paycom.uz'
      : 'https://checkout.paycom.uz';
  }

  /**
   * Payme checkout URL yaratish
   * Shu venue ning o'z merchant ID si ishlatiladi
   */
  async createInvoice(venueId: string, userId: string, bookingId: string, amount: number, returnUrl?: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, venueId },
    });
    if (!booking) throw new BadRequestException('Buyurtma topilmadi');

    // Payme faqat UZS bilan ishlaydi
    if (booking.currency !== 'UZS') {
      throw new BadRequestException(
        "Payme to'lovi faqat UZS valyutadagi bronlar uchun mavjud",
      );
    }

    // Shu venue ning kalitlarini olish
    const settings = await this.getVenueSettings(venueId);

    // Payme summani tiyinda qabul qiladi (1 so'm = 100 tiyin)
    const amountInTiyin = Math.round(amount * 100);

    // Payment yaratish (pending status)
    const paymentNumber = await this.generatePaymentNumber();
    const payment = this.paymentRepo.create({
      paymentNumber,
      venueId,
      bookingId,
      clientId: booking.clientId,
      receivedBy: userId,
      amount,
      currency: 'UZS',
      amountInBase: amount,
      paymentMethod: 'payme',
      paymentType: 'payment',
      status: 'pending',
    });
    const savedPayment = await this.paymentRepo.save(payment);

    // Bu venue ning Payme checkout URL generatsiya
    const params = {
      m: settings.paymeMerchantId,
      ac: { payment_id: savedPayment.id },
      a: amountInTiyin,
      c: returnUrl || '',
    };

    const encodedParams = Buffer.from(JSON.stringify(params)).toString('base64');
    const checkoutUrl = this.getCheckoutUrl(settings.paymeTestMode);
    const paymeUrl = `${checkoutUrl}/${encodedParams}`;

    return {
      paymentId: savedPayment.id,
      paymentNumber: savedPayment.paymentNumber,
      paymeUrl,
      amount,
      amountInTiyin,
    };
  }

  /**
   * Payme JSON-RPC Webhook handler
   * 
   * Payme serveri bitta webhook URL'ga yuboradi.
   * Biz payment_id orqali qaysi venue ekanini aniqlaymiz,
   * keyin shu venue ning merchant_key bilan auth tekshiramiz.
   */
  async handleWebhook(authHeader: string, body: any) {
    const { method, params, id } = body;

    try {
      // Avval payment_id orqali venue'ni aniqlash
      const venueId = await this.resolveVenueFromParams(method, params);
      if (venueId) {
        const settings = await this.settingsRepo.findOne({ where: { venueId } });
        if (settings?.paymeMerchantKey) {
          this.verifyAuth(authHeader, settings.paymeMerchantKey);
        }
      }

      let result: any;

      switch (method) {
        case 'CheckPerformTransaction':
          result = await this.checkPerformTransaction(params);
          break;
        case 'CreateTransaction':
          result = await this.createTransaction(params);
          break;
        case 'PerformTransaction':
          result = await this.performTransaction(params);
          break;
        case 'CancelTransaction':
          result = await this.cancelTransaction(params);
          break;
        case 'CheckTransaction':
          result = await this.checkTransaction(params);
          break;
        default:
          return { error: { code: -32601, message: 'Method not found' }, id };
      }

      return { result, id };
    } catch (error) {
      this.logger.error(`Payme webhook error [${method}]:`, error.message);
      return {
        error: {
          code: error.code || -31008,
          message: { uz: error.message, ru: error.message, en: error.message },
        },
        id,
      };
    }
  }

  /**
   * Webhook parametrlaridan venue ID ni aniqlash
   */
  private async resolveVenueFromParams(method: string, params: any): Promise<string | null> {
    let payment: Payment | null = null;

    if (method === 'CheckPerformTransaction' || method === 'CreateTransaction') {
      const paymentId = params?.account?.payment_id;
      if (paymentId) {
        payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
      }
    } else {
      // PerformTransaction, CancelTransaction, CheckTransaction — transactionId bilan
      if (params?.id) {
        payment = await this.paymentRepo.findOne({ where: { transactionId: params.id } });
      }
    }

    return payment?.venueId || null;
  }

  // ─── Payme Merchant API Methods ──────────────────

  private async checkPerformTransaction(params: any) {
    const paymentId = params.account?.payment_id;
    if (!paymentId) {
      throw { code: -31050, message: 'Payment ID topilmadi' };
    }

    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw { code: -31050, message: 'To\'lov topilmadi' };
    }

    if (payment.status === 'completed') {
      throw { code: -31051, message: 'Bu to\'lov allaqachon amalga oshirilgan' };
    }

    if (payment.status === 'cancelled') {
      throw { code: -31051, message: 'Bu to\'lov bekor qilingan' };
    }

    const expectedAmount = Math.round(Number(payment.amount) * 100);
    if (params.amount !== expectedAmount) {
      throw { code: -31001, message: 'Noto\'g\'ri summa' };
    }

    return { allow: true };
  }

  private async createTransaction(params: any) {
    const paymentId = params.account?.payment_id;
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw { code: -31050, message: 'To\'lov topilmadi' };
    }

    // Agar allaqachon transaction yaratilgan bo'lsa
    if (payment.transactionId && payment.transactionId === params.id) {
      return {
        create_time: payment.providerData?.create_time || Date.now(),
        transaction: payment.transactionId,
        state: payment.providerData?.state || 1,
      };
    }

    // Yangi transaction
    const createTime = Date.now();
    payment.transactionId = params.id;
    payment.providerData = {
      create_time: createTime,
      state: 1, // Created
      payme_id: params.id,
    };
    await this.paymentRepo.save(payment);

    return {
      create_time: createTime,
      transaction: params.id,
      state: 1,
    };
  }

  private async performTransaction(params: any) {
    const payment = await this.paymentRepo.findOne({
      where: { transactionId: params.id },
    });

    if (!payment) {
      throw { code: -31003, message: 'Transaction topilmadi' };
    }

    if (payment.status === 'completed') {
      return {
        transaction: params.id,
        perform_time: payment.providerData?.perform_time || Date.now(),
        state: 2,
      };
    }

    // To'lovni yakunlash + booking'ni yangilash atomik
    const performTime = Date.now();
    await this.dataSource.transaction(async (manager) => {
      const paymentRepo = manager.getRepository(Payment);
      const lockedPayment = await paymentRepo
        .createQueryBuilder('p')
        .where('p.id = :id', { id: payment.id })
        .setLock('pessimistic_write')
        .getOne();

      if (!lockedPayment || lockedPayment.status === 'completed') {
        return; // boshqa parallel request bizni o'zib o'tdi
      }

      lockedPayment.status = 'completed';
      lockedPayment.paidAt = new Date();
      lockedPayment.providerData = {
        ...lockedPayment.providerData,
        perform_time: performTime,
        state: 2,
      };
      await paymentRepo.save(lockedPayment);
      await this.updateBookingAfterPayment(lockedPayment, manager);
    });

    this.logger.log(`Payme to'lov yakunlandi: ${payment.paymentNumber}, summa: ${payment.amount} UZS`);

    return {
      transaction: params.id,
      perform_time: performTime,
      state: 2,
    };
  }

  private async cancelTransaction(params: any) {
    const payment = await this.paymentRepo.findOne({
      where: { transactionId: params.id },
    });

    if (!payment) {
      throw { code: -31003, message: 'Transaction topilmadi' };
    }

    if (payment.status === 'cancelled') {
      return {
        transaction: params.id,
        cancel_time: payment.providerData?.cancel_time || Date.now(),
        state: -1,
      };
    }

    const cancelTime = Date.now();
    const wasCompleted = payment.status === 'completed';

    payment.status = 'cancelled';
    payment.providerData = {
      ...payment.providerData,
      cancel_time: cancelTime,
      reason: params.reason,
      state: wasCompleted ? -2 : -1,
    };
    await this.paymentRepo.save(payment);

    // Agar to'lov yakunlangan bo'lgan bo'lsa, booking'ni qaytarish
    if (wasCompleted) {
      await this.reverseBookingPayment(payment);
    }

    return {
      transaction: params.id,
      cancel_time: cancelTime,
      state: wasCompleted ? -2 : -1,
    };
  }

  private async checkTransaction(params: any) {
    const payment = await this.paymentRepo.findOne({
      where: { transactionId: params.id },
    });

    if (!payment) {
      throw { code: -31003, message: 'Transaction topilmadi' };
    }

    return {
      create_time: payment.providerData?.create_time || 0,
      perform_time: payment.providerData?.perform_time || 0,
      cancel_time: payment.providerData?.cancel_time || 0,
      transaction: params.id,
      state: payment.providerData?.state || 1,
      reason: payment.providerData?.reason || null,
    };
  }

  // ─── Helpers ───────────────────────────────────────

  private verifyAuth(authHeader: string, merchantKey: string) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException('Auth header yo\'q');
    }

    const decoded = Buffer.from(authHeader.replace('Basic ', ''), 'base64').toString('utf-8');
    const [login, password] = decoded.split(':');

    if (login !== 'Paycom' || password !== merchantKey) {
      throw new UnauthorizedException('Noto\'g\'ri credentials');
    }
  }

  private async updateBookingAfterPayment(payment: Payment, manager?: any) {
    const bookingRepo = manager ? manager.getRepository(Booking) : this.bookingRepo;
    const booking = await bookingRepo.findOne({
      where: { id: payment.bookingId },
    });
    if (!booking) return;

    // Cap: paidAmount totalAmount'dan oshmasligi shart
    const newPaid = Number(booking.paidAmount) + Number(payment.amount);
    booking.paidAmount = Math.min(newPaid, Number(booking.totalAmount));
    booking.remainingAmount = Math.max(
      0,
      Number(booking.totalAmount) - Number(booking.paidAmount),
    );

    if (booking.remainingAmount <= 0) {
      booking.status = 'fully_paid';
      booking.remainingAmount = 0;
    } else if (['pending', 'fully_paid'].includes(booking.status)) {
      booking.status = 'deposit_paid';
    }

    await bookingRepo.save(booking);
  }

  private async reverseBookingPayment(payment: Payment) {
    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });
    if (!booking) return;

    booking.paidAmount = Math.max(0, Number(booking.paidAmount) - Number(payment.amount));
    booking.remainingAmount = Number(booking.totalAmount) - Number(booking.paidAmount);

    if (booking.paidAmount <= 0) {
      booking.status = 'pending';
    } else {
      booking.status = 'deposit_paid';
    }

    await this.bookingRepo.save(booking);
  }

  private async generatePaymentNumber(): Promise<string> {
    const num = await nextPaymentNumber(this.dataSource);
    return num.replace(/^PAY-/, 'PAYME-');
  }
}
