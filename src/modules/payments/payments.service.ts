import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { VenuePaymentSettings } from './entities/venue-payment-settings.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Client } from '../clients/entities/client.entity';
import { SmsService } from '../sms/sms.service';
import { UpdatePaymentSettingsDto } from './dto';
import { nextPaymentNumber } from '../../common/utils/sequence.util';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(VenuePaymentSettings)
    private readonly settingsRepo: Repository<VenuePaymentSettings>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly smsService: SmsService,
    private readonly dataSource: DataSource,
  ) {}

  // ═══ Payment Settings (Payme/Click) ═══

  async getPaymentSettings(venueId: string) {
    let settings = await this.settingsRepo.findOne({ where: { venueId } });
    if (!settings) {
      // Yangi to'yxona uchun default settings yaratish
      settings = this.settingsRepo.create({ venueId });
      settings = await this.settingsRepo.save(settings);
    }
    // Kalitlarni maskalash (faqat oxirgi 4 belgini ko'rsatish)
    return {
      ...settings,
      paymeMerchantKey: settings.paymeMerchantKey
        ? '****' + settings.paymeMerchantKey.slice(-4)
        : null,
      clickSecretKey: settings.clickSecretKey
        ? '****' + settings.clickSecretKey.slice(-4)
        : null,
    };
  }

  async updatePaymentSettings(venueId: string, dto: UpdatePaymentSettingsDto) {
    let settings = await this.settingsRepo.findOne({ where: { venueId } });
    if (!settings) {
      settings = this.settingsRepo.create({ venueId });
    }
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }

  /**
   * Venue uchun settings olish (Payme/Click service'lar ishlatadi)
   */
  async getVenuePaymentConfig(venueId: string): Promise<VenuePaymentSettings | null> {
    return this.settingsRepo.findOne({ where: { venueId } });
  }

  async create(venueId: string, userId: string, data: any) {
    const booking = await this.bookingRepo.findOne({
      where: { id: data.bookingId, venueId },
    });

    if (!booking) throw new NotFoundException('Buyurtma topilmadi');

    const isRefund = (data.paymentType || 'payment') === 'refund';
    const remainingAmount = Number(booking.remainingAmount) || 0;

    // ── Currency mismatch tekshiruv ──
    // Booking valyutasidan farq qilsa, exchangeRate va amountInBase majburiy
    const paymentCurrency = data.currency || booking.currency;
    let amountInBase: number;
    if (paymentCurrency !== booking.currency) {
      if (!data.exchangeRate || Number(data.exchangeRate) <= 0) {
        throw new BadRequestException(
          `Valyuta mos kelmaydi (booking: ${booking.currency}, payment: ${paymentCurrency}). exchangeRate majburiy.`,
        );
      }
      // Backend hisoblaydi, foydalanuvchidan amountInBase qabul qilmaymiz
      amountInBase = Number(data.amount) * Number(data.exchangeRate);
    } else {
      amountInBase = Number(data.amount);
    }

    if (!Number.isFinite(amountInBase) || amountInBase <= 0) {
      throw new BadRequestException("To'lov summasi noto'g'ri");
    }

    // Refund bo'lmasa, to'liq to'langanini tekshirish
    if (!isRefund && remainingAmount <= 0) {
      throw new BadRequestException("Bu buyurtma to'liq to'langan");
    }

    // Ortiqcha to'lov qilmaslik (refund bo'lmasa) — booking valyutasida solishtir
    if (!isRefund && amountInBase > remainingAmount + 0.01) {
      throw new BadRequestException(
        `To'lov summasi qoldiq summadan oshib ketdi. Qoldiq: ${remainingAmount} ${booking.currency}`,
      );
    }

    if (isRefund && amountInBase > Number(booking.paidAmount) + 0.01) {
      throw new BadRequestException(
        `Refund summasi to'langan summadan oshib ketdi. To'langan: ${booking.paidAmount} ${booking.currency}`,
      );
    }

    const paymentNumber = await this.generatePaymentNumber();

    const paymentData: Partial<Payment> = {
      paymentNumber,
      venueId,
      bookingId: data.bookingId,
      clientId: booking.clientId,
      receivedBy: userId,
      amount: data.amount,
      currency: paymentCurrency,
      exchangeRate: data.exchangeRate,
      amountInBase,
      paymentMethod: data.paymentMethod,
      paymentType: data.paymentType || 'payment',
      notes: data.notes,
      status: data.paymentMethod === 'cash' ? 'completed' : 'pending',
      paidAt: data.paymentMethod === 'cash' ? new Date() : null,
    };

    const payment = this.paymentRepo.create(paymentData);
    const savedPayment = await this.paymentRepo.save(payment);

    // Update booking amounts (faqat completed bo'lgan to'lovlar)
    if (savedPayment.status === 'completed') {
      await this.applyPaymentToBooking(booking, amountInBase, isRefund);

      // Mijoz totalSpent — REAL pul harakatidan
      if (booking.clientId) {
        if (isRefund) {
          await this.clientRepo.decrement(
            { id: booking.clientId },
            'totalSpent',
            amountInBase,
          );
        } else {
          await this.clientRepo.increment(
            { id: booking.clientId },
            'totalSpent',
            amountInBase,
          );
        }
      }

      if (!isRefund) {
        const client = await this.clientRepo.findOne({ where: { id: booking.clientId }});
        if (client && client.phone) {
          const formattedAmount = Number(data.amount).toLocaleString('ru-RU') + ' ' + paymentCurrency;
          const formattedRemaining = Number(booking.remainingAmount).toLocaleString('ru-RU') + ' ' + booking.currency;

          let msg = `Hurmatli ${client.fullName}! Sizning ${booking.bookingNumber} brongiz hisobiga ${formattedAmount} to'lov qabul qilindi. `;

          if (booking.remainingAmount > 0) {
            msg += `Qoldiq qarzingiz: ${formattedRemaining}.`;
          } else {
            msg += `To'lov to'liq to'landi.`;
          }
          try {
            await this.smsService.sendSms(client.phone, msg);
          } catch {
            // SMS xatosi to'lovni buzmaydi
          }
        }
      }
    }

    return savedPayment;
  }

  /**
   * Apply a payment delta to booking.paidAmount/remainingAmount/status.
   * Centralized so create/update/cancel all use the same logic.
   */
  private async applyPaymentToBooking(
    booking: Booking,
    amountInBase: number,
    isRefund: boolean,
  ) {
    if (isRefund) {
      booking.paidAmount = Number(booking.paidAmount) - amountInBase;
      if (Number(booking.paidAmount) < 0) booking.paidAmount = 0;
    } else {
      booking.paidAmount = Number(booking.paidAmount) + amountInBase;
    }

    booking.remainingAmount =
      Number(booking.totalAmount) - Number(booking.paidAmount);

    if (booking.remainingAmount <= 0) {
      booking.status = 'fully_paid';
      booking.remainingAmount = 0;
    } else if (Number(booking.paidAmount) > 0) {
      // pending yoki fully_paid → deposit_paid
      if (['pending', 'fully_paid'].includes(booking.status)) {
        booking.status = 'deposit_paid';
      }
    } else {
      // paidAmount 0 ga tushdi (refund) → pending
      booking.status = 'pending';
    }

    await this.bookingRepo.save(booking);
  }

  async findAllByVenue(venueId: string, filters?: any) {
    const qb = this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndSelect('payment.client', 'client')
      .where('payment.venueId = :venueId', { venueId });

    if (filters?.bookingId) {
      qb.andWhere('payment.bookingId = :bookingId', {
        bookingId: filters.bookingId,
      });
    }

    if (filters?.status) {
      qb.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters?.paymentMethod) {
      qb.andWhere('payment.paymentMethod = :paymentMethod', { paymentMethod: filters.paymentMethod });
    }

    qb.orderBy('payment.createdAt', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string, venueId?: string) {
    const where: any = { id };
    if (venueId) where.venueId = venueId;

    const payment = await this.paymentRepo.findOne({
      where,
      relations: ['booking', 'client', 'receiver'],
    });
    if (!payment) throw new NotFoundException('To\'lov topilmadi');
    return payment;
  }

  async update(venueId: string, id: string, data: any) {
    const payment = await this.findOne(id, venueId);

    const wasCompleted = payment.status === 'completed';
    const oldAmountInBase = Number(payment.amountInBase || payment.amount);
    const isRefund = payment.paymentType === 'refund';

    // ── Strict guard: completed payment'da amount/currency ni o'zgartirib bo'lmaydi ──
    // Pul harakatini buzmaslik uchun. Refund kerak bo'lsa — alohida payment yarating.
    if (wasCompleted) {
      const blockedFields = ['amount', 'currency', 'exchangeRate', 'amountInBase', 'paymentType'];
      for (const f of blockedFields) {
        if (data[f] !== undefined && data[f] !== (payment as any)[f]) {
          throw new BadRequestException(
            `Yakunlangan to'lovning '${f}' maydonini o'zgartirib bo'lmaydi. Yangi refund payment yarating.`,
          );
        }
      }
    }

    // venueId ni o'zgartirishga ruxsat yo'q
    delete data.venueId;
    delete data.bookingId;

    Object.assign(payment, data);

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId, venueId },
    });

    // Status: pending/failed → completed (pul qo'shiladi)
    if (!wasCompleted && payment.status === 'completed') {
      payment.paidAt = new Date();

      if (booking) {
        await this.applyPaymentToBooking(booking, oldAmountInBase, isRefund);

        // Mijoz totalSpent ham
        if (booking.clientId) {
          if (isRefund) {
            await this.clientRepo.decrement(
              { id: booking.clientId },
              'totalSpent',
              oldAmountInBase,
            );
          } else {
            await this.clientRepo.increment(
              { id: booking.clientId },
              'totalSpent',
              oldAmountInBase,
            );
          }
        }
      }
    }

    // Status: completed → failed/refunded (pul qaytariladi)
    if (wasCompleted && ['failed', 'refunded'].includes(payment.status)) {
      if (booking) {
        // Pul harakatini teskariga (revert)
        await this.applyPaymentToBooking(booking, oldAmountInBase, !isRefund);

        if (booking.clientId) {
          if (isRefund) {
            // Refund bekor — totalSpent qayta ortadi
            await this.clientRepo.increment(
              { id: booking.clientId },
              'totalSpent',
              oldAmountInBase,
            );
          } else {
            await this.clientRepo.decrement(
              { id: booking.clientId },
              'totalSpent',
              oldAmountInBase,
            );
          }
        }
      }
    }

    return this.paymentRepo.save(payment);
  }

  async remove(venueId: string, id: string) {
    const payment = await this.findOne(id, venueId);

    if (payment.status === 'completed') {
      throw new BadRequestException(
        'Yakunlangan to\'lovni o\'chirib bo\'lmaydi',
      );
    }

    await this.paymentRepo.softDelete(id);
    return { message: 'To\'lov o\'chirildi' };
  }

  private async generatePaymentNumber(): Promise<string> {
    return nextPaymentNumber(this.dataSource);
  }
}
