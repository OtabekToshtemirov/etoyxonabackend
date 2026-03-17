import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { VenuePaymentSettings } from './entities/venue-payment-settings.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Client } from '../clients/entities/client.entity';
import { SmsService } from '../sms/sms.service';
import { UpdatePaymentSettingsDto } from './dto';

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

    // Refund bo'lmasa, to'liq to'langanini tekshirish
    if (!isRefund && remainingAmount <= 0) {
      throw new BadRequestException('Bu buyurtma to\'liq to\'langan');
    }

    // Ortiqcha to'lov qilmaslik (refund bo'lmasa)
    if (!isRefund && Number(data.amount) > remainingAmount) {
      throw new BadRequestException(
        `To'lov summasi qoldiq summadan oshib ketdi. Qoldiq: ${remainingAmount}`,
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
      currency: data.currency || booking.currency,
      exchangeRate: data.exchangeRate,
      amountInBase: data.amountInBase || data.amount,
      paymentMethod: data.paymentMethod,
      paymentType: data.paymentType || 'payment',
      notes: data.notes,
      status: data.paymentMethod === 'cash' ? 'completed' : 'pending',
      paidAt: data.paymentMethod === 'cash' ? new Date() : null,
    };

    const payment = this.paymentRepo.create(paymentData);
    const savedPayment = await this.paymentRepo.save(payment);

    // Update booking amounts
    if (savedPayment.status === 'completed') {
      const amountInBookingCurrency = Number(savedPayment.amountInBase || savedPayment.amount);

      if (isRefund) {
        // Refund — paidAmount dan ayirish
        booking.paidAmount = Number(booking.paidAmount) - amountInBookingCurrency;
        if (Number(booking.paidAmount) < 0) booking.paidAmount = 0;
      } else {
        // Oddiy to'lov — paidAmount ga qo'shish
        booking.paidAmount = Number(booking.paidAmount) + amountInBookingCurrency;
      }

      booking.remainingAmount = Number(booking.totalAmount) - Number(booking.paidAmount);

      if (booking.remainingAmount <= 0) {
        booking.status = 'fully_paid';
        booking.remainingAmount = 0;
      } else if (Number(booking.paidAmount) > 0 && booking.status === 'pending') {
        booking.status = 'deposit_paid';
      }

      await this.bookingRepo.save(booking);

      if (!isRefund) {
        const client = await this.clientRepo.findOne({ where: { id: booking.clientId }});
        if (client && client.phone) {
            const formattedAmount = Number(data.amount).toLocaleString('ru-RU') + ' ' + (data.currency || booking.currency);
            const formattedRemaining = Number(booking.remainingAmount).toLocaleString('ru-RU') + ' ' + (data.currency || booking.currency);
            
            let msg = `Hurmatli ${client.fullName}! Sizning ${booking.bookingNumber} brongiz hisobiga ${formattedAmount} to'lov qabul qilindi. `;
            
            if (booking.remainingAmount > 0) {
                msg += `Qoldiq qarzingiz: ${formattedRemaining}.`;
            } else {
                msg += `To'lov toliq to'landi.`;
            }
            await this.smsService.sendSms(client.phone, msg);
        }
      }
    }

    return savedPayment;
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
    const oldAmount = Number(payment.amountInBase || payment.amount);
    const isRefund = payment.paymentType === 'refund';
    Object.assign(payment, data);

    const booking = await this.bookingRepo.findOne({
      where: { id: payment.bookingId },
    });

    // Status: pending/failed → completed (pul qo'shiladi)
    if (!wasCompleted && payment.status === 'completed') {
      payment.paidAt = new Date();

      if (booking) {
        const amountInBase = Number(payment.amountInBase || payment.amount);
        if (isRefund) {
          booking.paidAmount = Number(booking.paidAmount) - amountInBase;
          if (Number(booking.paidAmount) < 0) booking.paidAmount = 0;
        } else {
          booking.paidAmount = Number(booking.paidAmount) + amountInBase;
        }
        booking.remainingAmount = Number(booking.totalAmount) - Number(booking.paidAmount);
        if (booking.remainingAmount <= 0) {
          booking.status = 'fully_paid';
          booking.remainingAmount = 0;
        } else if (Number(booking.paidAmount) > 0 && booking.status === 'pending') {
          booking.status = 'deposit_paid';
        }
        await this.bookingRepo.save(booking);
      }
    }

    // Status: completed → failed/refunded (pul qaytariladi)
    if (wasCompleted && ['failed', 'refunded'].includes(payment.status)) {
      if (booking) {
        if (isRefund) {
          // Refund bekor qilindi — pulni qaytarish
          booking.paidAmount = Number(booking.paidAmount) + oldAmount;
        } else {
          // Oddiy to'lov bekor bo'ldi — pulni ayirish
          booking.paidAmount = Number(booking.paidAmount) - oldAmount;
          if (Number(booking.paidAmount) < 0) booking.paidAmount = 0;
        }
        booking.remainingAmount = Number(booking.totalAmount) - Number(booking.paidAmount);
        if (booking.remainingAmount <= 0) {
          booking.status = 'fully_paid';
          booking.remainingAmount = 0;
        } else if (Number(booking.paidAmount) > 0) {
          booking.status = 'deposit_paid';
        } else {
          booking.status = 'pending';
        }
        await this.bookingRepo.save(booking);
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
    const year = new Date().getFullYear();
    const lastPayment = await this.paymentRepo.findOne({
      where: {},
      order: { createdAt: 'DESC' },
      withDeleted: true,
    });
    let nextNum = 1;
    if (lastPayment?.paymentNumber) {
      const match = lastPayment.paymentNumber.match(/PAY-\d+-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    return `PAY-${year}-${String(nextNum).padStart(4, '0')}`;
  }
}
