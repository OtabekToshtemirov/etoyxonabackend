import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingMenuItem } from './entities/booking-menu-item.entity';
import { BookingService } from './entities/booking-service.entity';
import { Hall } from '../halls/entities/hall.entity';
import { Client } from '../clients/entities/client.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaginationDto } from '../../common/dto';
import { CancelBookingDto } from './dto';
import { SmsService } from '../sms/sms.service';
import { nextBookingNumber, nextRefundNumber } from '../../common/utils/sequence.util';
import { normalizePhone } from '../../common/utils/phone.util';

const TIME_SLOT_MAP: Record<string, { start: string; end: string }> = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening: { start: '17:00', end: '23:00' },
  full_day: { start: '08:00', end: '23:00' },
};

function timeToMinutes(time: string): number {
  if (!time || typeof time !== 'string') return 0;
  const parts = time.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

function resolveTimeRange(
  timeSlot: string,
  startTime?: string,
  endTime?: string,
): { start: number; end: number } {
  if (timeSlot === 'custom') {
    return {
      start: timeToMinutes(startTime || '00:00'),
      end: timeToMinutes(endTime || '23:59'),
    };
  }
  const slot = TIME_SLOT_MAP[timeSlot];
  if (slot) {
    return { start: timeToMinutes(slot.start), end: timeToMinutes(slot.end) };
  }
  return {
    start: timeToMinutes(startTime || '00:00'),
    end: timeToMinutes(endTime || '23:59'),
  };
}

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingMenuItem)
    private readonly bookingMenuItemRepo: Repository<BookingMenuItem>,
    @InjectRepository(BookingService)
    private readonly bookingServiceRepo: Repository<BookingService>,
    @InjectRepository(Hall)
    private readonly hallRepo: Repository<Hall>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly smsService: SmsService,
  ) {}

  async create(venueId: string, userId: string, data: any) {
    // ── Validatsiya: custom time start < end ──
    if (data.timeSlot === 'custom') {
      if (!data.customStartTime || !data.customEndTime) {
        throw new BadRequestException(
          "Custom vaqt uchun boshlanish va tugash vaqti majburiy",
        );
      }
      if (
        timeToMinutes(data.customStartTime) >=
        timeToMinutes(data.customEndTime)
      ) {
        throw new BadRequestException(
          "Boshlanish vaqti tugash vaqtidan oldin bo'lishi kerak",
        );
      }
    }

    // ── Validatsiya: guestCount > 0 ──
    if (!data.guestCount || data.guestCount < 1) {
      throw new BadRequestException("Mehmonlar soni 1 dan kam bo'lmasin");
    }

    const savedBooking = await this.dataSource.transaction(async (manager) => {
      const bookingRepo = manager.getRepository(Booking);
      const hallRepo = manager.getRepository(Hall);

      // ── Hall row lock (zalda hech qanday bron bo'lmasa ham bloklash uchun) ──
      const hall = await hallRepo
        .createQueryBuilder('hall')
        .where('hall.id = :id', { id: data.hallId })
        .andWhere('hall.venueId = :venueId', { venueId })
        .setLock('pessimistic_write')
        .getOne();

      if (!hall) {
        throw new NotFoundException('Zal topilmadi');
      }

      // ── Capacity tekshirish ──
      if (hall.maxCapacity && data.guestCount > hall.maxCapacity) {
        throw new BadRequestException(
          `Mehmonlar soni zal sig'imidan oshib ketdi. Maksimal: ${hall.maxCapacity}`,
        );
      }

      // Endi shu zal va sanadagi bronlarni o'qiymiz (lock allaqachon hall'ga qo'yilgan)
      const existingBookings = await bookingRepo
        .createQueryBuilder('booking')
        .where('booking.hallId = :hallId', { hallId: data.hallId })
        .andWhere('booking.eventDate = :eventDate', {
          eventDate: data.eventDate,
        })
        .andWhere('booking.status != :cancelled', { cancelled: 'cancelled' })
        .getMany();

      // Yangi bron vaqtini aniqlash
      const newRange = resolveTimeRange(
        data.timeSlot,
        data.customStartTime,
        data.customEndTime,
      );

      // Overlap tekshirish
      for (const existing of existingBookings) {
        const existRange = resolveTimeRange(
          existing.timeSlot,
          existing.startTime,
          existing.endTime,
        );
        if (newRange.start < existRange.end && newRange.end > existRange.start) {
          throw new BadRequestException(
            'Bu sana va vaqtda zal band. Boshqa vaqt tanlang.',
          );
        }
      }

      // Mijozni aniqlash (agar yangi bo'lsa yaratish)
      let clientId = data.clientId;
      if (!clientId && data.clientPhone) {
        const clientRepo = manager.getRepository(Client);
        const normalizedPhone = normalizePhone(data.clientPhone);
        let client = await clientRepo.findOne({
          where: { phone: normalizedPhone, venueId },
        });
        if (!client) {
          client = clientRepo.create({
            venueId,
            phone: normalizedPhone,
            fullName: data.clientFullName || "Noma'lum",
            source: 'phone',
          });
          client = await clientRepo.save(client);
        }
        clientId = client.id;
      }

      // Zal narxi
      const hallPrice = data.hallPrice ?? Number(hall.hallPrice || 0);

      // Vaqt — strict: timeSlot='custom' bo'lsagina custom*Time qabul qilinadi
      let startTime: string;
      let endTime: string;
      if (data.timeSlot === 'custom') {
        startTime = data.customStartTime;
        endTime = data.customEndTime;
      } else if (TIME_SLOT_MAP[data.timeSlot]) {
        startTime = TIME_SLOT_MAP[data.timeSlot].start;
        endTime = TIME_SLOT_MAP[data.timeSlot].end;
      } else {
        startTime = data.startTime || '08:00';
        endTime = data.endTime || '23:00';
      }

      // Xizmatlar
      let servicesTotal = data.servicesTotal || 0;
      if (data.services?.length) {
        servicesTotal = data.services.reduce(
          (sum: number, s: { quantity: number; unitPrice: number }) =>
            sum + s.quantity * s.unitPrice,
          0,
        );
      }

      const bookingNumber = await this.generateBookingNumber(manager);
      const menuTotal = (data.menuPricePerPerson || 0) * data.guestCount;
      const subtotal = hallPrice + menuTotal + servicesTotal;
      const discountAmount = data.discountAmount || 0;
      const totalAmount = subtotal - discountAmount;

      const booking = bookingRepo.create({
        bookingNumber,
        venueId,
        createdBy: userId,
        hallId: data.hallId,
        clientId,
        eventDate: data.eventDate,
        timeSlot: data.timeSlot,
        startTime,
        endTime,
        guestCount: data.guestCount,
        eventType: data.eventType || 'wedding',
        venuePackageId: data.venuePackageId,
        menuPackageId: data.menuPackageId,
        menuPricePerPerson: data.menuPricePerPerson,
        currency: data.currency || 'UZS',
        exchangeRate: data.exchangeRate,
        hallPrice,
        servicesTotal,
        menuTotal,
        subtotal,
        discountAmount,
        discountReason: data.discountReason,
        totalAmount,
        remainingAmount: totalAmount,
        notes: data.notes,
        internalNotes: data.internalNotes,
      });

      const saved = await bookingRepo.save(booking);

      if (clientId) {
        const clientRepo = manager.getRepository(Client);
        await clientRepo.increment({ id: clientId }, 'totalBookings', 1);
        // totalSpent — actualpaymentlardan keladi (PaymentsService.create).
      }

      if (data.menuItems?.length) {
        const menuItemRepo = manager.getRepository(BookingMenuItem);
        const bookingMenuItems = data.menuItems.map(
          (item: {
            menuItemId: string;
            quantity: number;
            pricePerPerson: number;
          }) =>
            menuItemRepo.create({
              bookingId: saved.id,
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              pricePerPerson: item.pricePerPerson,
              totalPrice: item.quantity * item.pricePerPerson,
            }),
        );
        await menuItemRepo.save(bookingMenuItems);
      }

      if (data.services?.length) {
        const serviceRepo = manager.getRepository(BookingService);
        const bookingServices = data.services.map(
          (s: {
            venueServiceId: string;
            quantity: number;
            unitPrice: number;
          }) =>
            serviceRepo.create({
              bookingId: saved.id,
              venueServiceId: s.venueServiceId,
              pricingType: 'fixed',
              unitPrice: s.unitPrice,
              quantity: s.quantity,
              totalPrice: s.quantity * s.unitPrice,
              status: 'confirmed',
            }),
        );
        await serviceRepo.save(bookingServices);
      }

      return saved;
    });

    // SMS - transaksiyadan tashqari (SMS xatosi bron buzmasligi uchun)
    if (savedBooking.clientId) {
      try {
        const client = await this.clientRepo.findOne({
          where: { id: savedBooking.clientId },
        });
        if (client?.phone) {
          const msg = `Hurmatli ${client.fullName}! Sizning ${savedBooking.eventDate} kuniga iToyxona orqali qilingan brongiz qabul qilindi. Zayavka: ${savedBooking.bookingNumber}.`;
          await this.smsService.sendSms(client.phone, msg);
        }
      } catch {
        // SMS xatosi brondan mustaqil
      }
    }

    return savedBooking;
  }

  async findAll(venueId: string, pagination: PaginationDto, filters?: any) {
    const { page, limit, skip, search } = pagination;

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.hall', 'hall')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('booking.menuPackage', 'menuPackage')
      .where('booking.venueId = :venueId', { venueId });

    if (search) {
      qb.andWhere(
        '(booking.bookingNumber ILIKE :search OR client.fullName ILIKE :search OR client.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (filters?.status) {
      const statuses = filters.status.split(',').map((s: string) => s.trim());
      if (statuses.length === 1) {
        qb.andWhere('booking.status = :status', { status: statuses[0] });
      } else {
        qb.andWhere('booking.status IN (:...statuses)', { statuses });
      }
    }

    if (filters?.eventDate) {
      qb.andWhere('booking.eventDate = :eventDate', {
        eventDate: filters.eventDate,
      });
    }

    if (filters?.hallId) {
      qb.andWhere('booking.hallId = :hallId', { hallId: filters.hallId });
    }

    qb.orderBy('booking.eventDate', 'ASC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string, venueId?: string) {
    const where: any = { id };
    if (venueId) where.venueId = venueId;

    const booking = await this.bookingRepo.findOne({
      where,
      relations: [
        'hall',
        'client',
        'menuPackage',
        'menuItems',
        'menuItems.menuItem',
        'services',
        'services.venueService',
        'payments',
        'creator',
      ],
    });

    if (!booking) throw new NotFoundException('Buyurtma topilmadi');
    return booking;
  }

  async update(venueId: string, id: string, data: Partial<Booking>) {
    const booking = await this.findOne(id, venueId);

    const guestCount = (data as any).guestCount ?? booking.guestCount;
    const hallPrice = (data as any).hallPrice ?? Number(booking.hallPrice);
    const menuPricePerPerson =
      (data as any).menuPricePerPerson ??
      (Number(booking.menuPricePerPerson) || 0);
    const servicesTotal =
      (data as any).servicesTotal ?? Number(booking.servicesTotal);
    const discountAmount =
      (data as any).discountAmount ?? Number(booking.discountAmount);

    const needsRecalc =
      (data as any).guestCount !== undefined ||
      (data as any).hallPrice !== undefined ||
      (data as any).menuPricePerPerson !== undefined ||
      (data as any).servicesTotal !== undefined ||
      (data as any).discountAmount !== undefined;

    if (needsRecalc) {
      const menuTotal = menuPricePerPerson * guestCount;
      const subtotal = hallPrice + menuTotal + servicesTotal;
      const totalAmount = subtotal - discountAmount;
      const paidAmount = Number(booking.paidAmount) || 0;
      const remainingAmount = Math.max(0, totalAmount - paidAmount);

      (data as any).menuTotal = menuTotal;
      (data as any).subtotal = subtotal;
      (data as any).totalAmount = totalAmount;
      (data as any).remainingAmount = remainingAmount;

      // ── Status sinxronlash: total o'zgargandan keyin paidAmount asosida ──
      // Cancelled/in_progress/completed statusini avtomatik o'zgartirmaymiz —
      // ular admin amali bilan o'rnatiladi.
      const protectedStatuses = ['cancelled', 'in_progress', 'completed'];
      if (!protectedStatuses.includes(booking.status)) {
        if (remainingAmount <= 0 && paidAmount > 0) {
          (data as any).status = 'fully_paid';
        } else if (paidAmount > 0) {
          (data as any).status = 'deposit_paid';
        } else if (
          booking.status === 'fully_paid' ||
          booking.status === 'deposit_paid'
        ) {
          // total oshib ketib, paid 0 bo'lishi (theoretically) — pending ga qayt
          (data as any).status = 'pending';
        }
      }
    }

    // venueId ni o'zgartirishga ruxsat bermaymiz
    delete (data as any).venueId;

    Object.assign(booking, data);
    return this.bookingRepo.save(booking);
  }

  async remove(venueId: string, id: string) {
    const booking = await this.findOne(id, venueId);

    if (['confirmed', 'completed', 'fully_paid'].includes(booking.status)) {
      throw new BadRequestException(
        "Tasdiqlangan yoki yakunlangan buyurtmani o'chirib bo'lmaydi. Avval bekor qiling.",
      );
    }

    await this.bookingRepo.softDelete(id);
    return { message: "Buyurtma o'chirildi" };
  }

  async cancel(
    venueId: string,
    id: string,
    dto: CancelBookingDto,
    userId: string,
  ) {
    const booking = await this.findOne(id, venueId);

    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new BadRequestException("Bu buyurtmani bekor qilib bo'lmaydi");
    }

    const paidAmount = Number(booking.paidAmount) || 0;
    let refundPayment: Payment | null = null;

    if (dto.refund && paidAmount > 0) {
      const paymentNumber = await this.generateRefundPaymentNumber();

      refundPayment = this.paymentRepo.create({
        paymentNumber,
        venueId: booking.venueId,
        bookingId: booking.id,
        clientId: booking.clientId,
        receivedBy: userId,
        amount: paidAmount,
        currency: booking.currency,
        paymentMethod: 'cash',
        paymentType: 'refund',
        status: 'completed',
        paidAt: new Date(),
        notes: `Bekor qilish sababi: ${dto.reason}`,
      });
      await this.paymentRepo.save(refundPayment);

      booking.paidAmount = 0;
      booking.remainingAmount = Number(booking.totalAmount);
    }

    if (booking.clientId) {
      await this.clientRepo.decrement(
        { id: booking.clientId },
        'totalBookings',
        1,
      );
      // totalSpent — refund payment'da kamayadi (PaymentsService da).
      // Booking cancel'da to'g'ridan-to'g'ri kamaytirmaymiz.
    }

    booking.status = 'cancelled';
    booking.cancellationReason = dto.reason;
    booking.cancelledAt = new Date();

    const savedBooking = await this.bookingRepo.save(booking);

    return {
      booking: savedBooking,
      refund: refundPayment
        ? {
            id: refundPayment.id,
            amount: paidAmount,
            currency: booking.currency,
          }
        : null,
    };
  }

  async getCalendar(venueId: string, month: string) {
    const startDate = `${month}-01`;
    const endDate = new Date(
      parseInt(month.split('-')[0]),
      parseInt(month.split('-')[1]),
      0,
    )
      .toISOString()
      .split('T')[0];

    return this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.hall', 'hall')
      .leftJoinAndSelect('booking.client', 'client')
      .where('booking.venueId = :venueId', { venueId })
      .andWhere('booking.eventDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('booking.status != :cancelled', { cancelled: 'cancelled' })
      .orderBy('booking.eventDate', 'ASC')
      .addOrderBy('booking.startTime', 'ASC')
      .getMany();
  }

  async checkAvailability(
    hallId: string,
    eventDate: string,
    timeSlot: string,
    excludeBookingId?: string,
    customStartTime?: string,
    customEndTime?: string,
  ): Promise<boolean> {
    const newRange = resolveTimeRange(timeSlot, customStartTime, customEndTime);

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.hallId = :hallId', { hallId })
      .andWhere('booking.eventDate = :eventDate', { eventDate })
      .andWhere('booking.status NOT IN (:...statuses)', {
        statuses: ['cancelled'],
      });

    if (excludeBookingId) {
      qb.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
    }

    const existingBookings = await qb.getMany();

    for (const existing of existingBookings) {
      const existRange = resolveTimeRange(
        existing.timeSlot,
        existing.startTime,
        existing.endTime,
      );
      if (newRange.start < existRange.end && newRange.end > existRange.start) {
        return false;
      }
    }

    return true;
  }

  private async generateRefundPaymentNumber(): Promise<string> {
    return nextRefundNumber(this.dataSource);
  }

  private async generateBookingNumber(
    manager?: EntityManager,
  ): Promise<string> {
    return nextBookingNumber(manager || this.dataSource);
  }
}
