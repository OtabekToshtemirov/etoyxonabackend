import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Payment } from '../entities/payment.entity';
import { VenuePaymentSettings } from '../entities/venue-payment-settings.entity';
import { Booking } from '../../bookings/entities/booking.entity';

/**
 * Click Merchant API integratsiyasi (per-venue)
 * 
 * Har bir to'yxona o'z Click merchant kalitlarini kiritadi.
 * Pul to'g'ridan-to'g'ri shu to'yxonaning Click hisobiga tushadi.
 * 
 * To'yxona egasi Settings sahifasida:
 *   1. click_merchant_id kiritadi
 *   2. click_service_id kiritadi
 *   3. click_secret_key kiritadi
 *   4. clickEnabled = true qiladi
 */
@Injectable()
export class ClickService {
  private readonly logger = new Logger(ClickService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(VenuePaymentSettings)
    private readonly settingsRepo: Repository<VenuePaymentSettings>,
  ) {}

  async isConfiguredForVenue(venueId: string): Promise<boolean> {
    const settings = await this.settingsRepo.findOne({ where: { venueId } });
    return !!(settings?.clickEnabled && settings?.clickMerchantId && settings?.clickServiceId && settings?.clickSecretKey);
  }

  private async getVenueSettings(venueId: string): Promise<VenuePaymentSettings> {
    const settings = await this.settingsRepo.findOne({ where: { venueId } });
    if (!settings || !settings.clickEnabled || !settings.clickMerchantId || !settings.clickServiceId || !settings.clickSecretKey) {
      throw new BadRequestException(
        'Click integratsiya sozlanmagan. Settings sahifasida Click merchant kalitlarini kiriting.',
      );
    }
    return settings;
  }

  /**
   * Click checkout URL yaratish (shu venue ning kalitlari bilan)
   */
  async createInvoice(venueId: string, userId: string, bookingId: string, amount: number, returnUrl?: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, venueId },
    });
    if (!booking) throw new BadRequestException('Buyurtma topilmadi');

    const settings = await this.getVenueSettings(venueId);

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
      paymentMethod: 'click',
      paymentType: 'payment',
      status: 'pending',
    });
    const savedPayment = await this.paymentRepo.save(payment);

    // Click checkout URL (shu venue ning merchant/service ID si)
    const clickUrl = new URL('https://my.click.uz/services/pay');
    clickUrl.searchParams.set('service_id', settings.clickServiceId!);
    clickUrl.searchParams.set('merchant_id', settings.clickMerchantId!);
    clickUrl.searchParams.set('amount', String(amount));
    clickUrl.searchParams.set('transaction_param', savedPayment.id);
    if (returnUrl) {
      clickUrl.searchParams.set('return_url', returnUrl);
    }

    return {
      paymentId: savedPayment.id,
      paymentNumber: savedPayment.paymentNumber,
      clickUrl: clickUrl.toString(),
      amount,
    };
  }

  /**
   * Click Prepare webhook
   * Payment ID orqali venue'ni aniqlab, shu venue ning secret_key bilan sign tekshiramiz
   */
  async handlePrepare(body: any) {
    const {
      click_trans_id,
      service_id,
      merchant_trans_id, // = payment.id
      amount,
      action,
      sign_time,
      sign_string,
    } = body;

    const payment = await this.paymentRepo.findOne({
      where: { id: merchant_trans_id },
    });

    if (!payment) {
      return { error: -5, error_note: 'Payment not found' };
    }

    // Shu venue ning secret_key ni olish
    const settings = await this.settingsRepo.findOne({ where: { venueId: payment.venueId } });
    if (!settings?.clickSecretKey) {
      return { error: -8, error_note: 'Click not configured for this venue' };
    }

    // Sign tekshirish (shu venue ning secret_key bilan)
    const expectedSign = this.generateSign(
      click_trans_id,
      service_id,
      settings.clickSecretKey,
      merchant_trans_id,
      amount,
      action,
      sign_time,
    );

    if (sign_string !== expectedSign) {
      return { error: -1, error_note: 'Sign verification failed' };
    }

    if (payment.status === 'cancelled') {
      return { error: -9, error_note: 'Payment cancelled' };
    }

    if (Math.abs(Number(payment.amount) - Number(amount)) > 1) {
      return { error: -2, error_note: 'Incorrect amount' };
    }

    // Click trans_id ni saqlash
    payment.transactionId = String(click_trans_id);
    payment.providerData = {
      ...payment.providerData,
      click_trans_id,
      prepare_time: Date.now(),
    };
    await this.paymentRepo.save(payment);

    return {
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: payment.id,
      error: 0,
      error_note: 'Success',
    };
  }

  /**
   * Click Complete webhook
   */
  async handleComplete(body: any) {
    const {
      click_trans_id,
      service_id,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      sign_time,
      sign_string,
      error,
    } = body;

    const payment = await this.paymentRepo.findOne({
      where: { id: merchant_trans_id },
    });

    if (!payment) {
      return { error: -5, error_note: 'Payment not found' };
    }

    // Shu venue ning secret_key ni olish
    const settings = await this.settingsRepo.findOne({ where: { venueId: payment.venueId } });
    if (!settings?.clickSecretKey) {
      return { error: -8, error_note: 'Click not configured for this venue' };
    }

    // Sign tekshirish
    const expectedSign = this.generateSign(
      click_trans_id,
      service_id,
      settings.clickSecretKey,
      merchant_trans_id,
      merchant_prepare_id,
      amount,
      action,
      sign_time,
    );

    if (sign_string !== expectedSign) {
      return { error: -1, error_note: 'Sign verification failed' };
    }

    // Click xatolik yuborgan bo'lsa
    if (error < 0) {
      payment.status = 'failed';
      payment.providerData = {
        ...payment.providerData,
        error,
        error_note: 'Click xatolik qaytardi',
      };
      await this.paymentRepo.save(payment);
      return {
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: payment.id,
        error: -9,
        error_note: 'Transaction cancelled',
      };
    }

    // To'lovni yakunlash
    payment.status = 'completed';
    payment.paidAt = new Date();
    payment.providerData = {
      ...payment.providerData,
      complete_time: Date.now(),
    };
    await this.paymentRepo.save(payment);

    // Booking'ni yangilash
    await this.updateBookingAfterPayment(payment);

    this.logger.log(`Click to'lov yakunlandi: ${payment.paymentNumber}, summa: ${payment.amount} UZS`);

    return {
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: payment.id,
      error: 0,
      error_note: 'Success',
    };
  }

  // ─── Helpers ───────────────────────────────────────

  private generateSign(...params: any[]): string {
    const signString = params.join('');
    return crypto.createHash('md5').update(signString).digest('hex');
  }

  private async updateBookingAfterPayment(payment: Payment) {
    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });
    if (!booking) return;

    booking.paidAmount = Number(booking.paidAmount) + Number(payment.amount);
    booking.remainingAmount = Number(booking.totalAmount) - Number(booking.paidAmount);

    if (booking.remainingAmount <= 0) {
      booking.status = 'fully_paid';
      booking.remainingAmount = 0;
    } else if (booking.status === 'pending') {
      booking.status = 'deposit_paid';
    }

    await this.bookingRepo.save(booking);
  }

  private async generatePaymentNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.paymentRepo.count();
    return `CLICK-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
