import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingMenuItem } from './entities/booking-menu-item.entity';
import { BookingService } from './entities/booking-service.entity';
import { Hall } from '../halls/entities/hall.entity';
import { Client } from '../clients/entities/client.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaginationDto } from '../../common/dto';
import { CancelBookingDto } from './dto';
import { SmsService } from '../sms/sms.service';

const TIME_SLOT_MAP: Record<string, { start: string; end: string }> = {
  morning: { start: '08:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening: { start: '17:00', end: '23:00' },
  full_day: { start: '08:00', end: '23:00' },
};

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
    private readonly smsService: SmsService,
  ) {}

  async create(venueId: string, userId: string, data: any) {
    // Check hall availability
    const isAvailable = await this.checkAvailability(
      data.hallId,
      data.eventDate,
      data.timeSlot,
    );

    if (!isAvailable) {
      throw new BadRequestException(
        'Bu sana va vaqtda zal band. Boshqa vaqt tanlang.',
      );
    }

    // Resolve client from phone + name if no clientId
    let clientId = data.clientId;
    if (!clientId && data.clientPhone) {
      let client = await this.clientRepo.findOne({
        where: { phone: data.clientPhone, venueId },
      });
      if (!client) {
        client = this.clientRepo.create({
          venueId,
          phone: data.clientPhone,
          fullName: data.clientFullName || 'Noma\'lum',
          source: 'phone',
        });
        client = await this.clientRepo.save(client);
      }
      clientId = client.id;
    }

    // Resolve hall price
    const hall = await this.hallRepo.findOne({ where: { id: data.hallId } });
    const hallPricePerPerson = data.hallPricePerPerson ?? (hall ? Number(hall.pricePerPerson) : 0);

    // Resolve time
    let startTime = data.startTime;
    let endTime = data.endTime;
    if (data.timeSlot === 'custom') {
      startTime = data.customStartTime || '08:00';
      endTime = data.customEndTime || '23:00';
    } else if (!startTime && TIME_SLOT_MAP[data.timeSlot]) {
      startTime = TIME_SLOT_MAP[data.timeSlot].start;
      endTime = TIME_SLOT_MAP[data.timeSlot].end;
    }

    // Calculate services total
    let servicesTotal = data.servicesTotal || 0;
    if (data.services?.length) {
      servicesTotal = data.services.reduce(
        (sum: number, s: { quantity: number; unitPrice: number }) =>
          sum + s.quantity * s.unitPrice,
        0,
      );
    }

    // Generate booking number
    const bookingNumber = await this.generateBookingNumber();

    // Calculate totals
    const menuTotal = (data.menuPricePerPerson || 0) * data.guestCount;
    const subtotal = (hallPricePerPerson * data.guestCount) + menuTotal + servicesTotal;
    const discountAmount = data.discountAmount || 0;
    const totalAmount = subtotal - discountAmount;

    const booking = this.bookingRepo.create({
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
      hallPricePerPerson,
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

    const savedBooking = await this.bookingRepo.save(booking);

    // Increment client totalBookings
    if (clientId) {
      await this.clientRepo.increment({ id: clientId }, 'totalBookings', 1);
      await this.clientRepo.increment({ id: clientId }, 'totalSpent', totalAmount);
    }

    // Save booking menu items
    if (data.menuItems?.length) {
      const bookingMenuItems = data.menuItems.map(
        (item: { menuItemId: string; quantity: number; pricePerPerson: number }) =>
          this.bookingMenuItemRepo.create({
            bookingId: savedBooking.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            pricePerPerson: item.pricePerPerson,
            totalPrice: item.quantity * item.pricePerPerson,
          }),
      );
      await this.bookingMenuItemRepo.save(bookingMenuItems);
    }

    // Save booking services
    if (data.services?.length) {
      const bookingServices = data.services.map(
        (s: { venueServiceId: string; quantity: number; unitPrice: number }) =>
          this.bookingServiceRepo.create({
            bookingId: savedBooking.id,
            venueServiceId: s.venueServiceId,
            pricingType: 'fixed',
            unitPrice: s.unitPrice,
            quantity: s.quantity,
            totalPrice: s.quantity * s.unitPrice,
            status: 'confirmed',
          }),
      );
      await this.bookingServiceRepo.save(bookingServices);
    }

    if (clientId) {
       const client = await this.clientRepo.findOne({ where: { id: clientId }});
       if (client && client.phone) {
          const msg = `Hurmatli ${client.fullName}! Sizning ${savedBooking.eventDate} kuniga iToyxona orqali qilingan brongiz qabul qilindi. Zayavka: ${savedBooking.bookingNumber}.`;
          await this.smsService.sendSms(client.phone, msg);
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

  async update(id: string, data: Partial<Booking>) {
    const booking = await this.findOne(id);
    Object.assign(booking, data);
    return this.bookingRepo.save(booking);
  }

  async remove(venueId: string, id: string) {
    const booking = await this.findOne(id, venueId);

    if (['confirmed', 'completed', 'fully_paid'].includes(booking.status)) {
      throw new BadRequestException(
        'Tasdiqlangan yoki yakunlangan buyurtmani o\'chirib bo\'lmaydi. Avval bekor qiling.',
      );
    }

    await this.bookingRepo.softDelete(id);
    return { message: 'Buyurtma o\'chirildi' };
  }

  async cancel(id: string, dto: CancelBookingDto, userId: string) {
    const booking = await this.findOne(id);

    if (['cancelled', 'completed'].includes(booking.status)) {
      throw new BadRequestException('Bu buyurtmani bekor qilib bo\'lmaydi');
    }

    const paidAmount = Number(booking.paidAmount) || 0;
    let refundPayment: Payment | null = null;

    // Agar to'lov bo'lgan bo'lsa va refund so'ralsa — qaytarish yozuvi yaratiladi
    if (dto.refund && paidAmount > 0) {
      const year = new Date().getFullYear();
      const count = await this.paymentRepo.count();
      const paymentNumber = `PAY-${year}-${String(count + 1).padStart(4, '0')}`;

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

    booking.status = 'cancelled';
    booking.cancellationReason = dto.reason;
    booking.cancelledAt = new Date();

    const savedBooking = await this.bookingRepo.save(booking);

    return {
      booking: savedBooking,
      refund: refundPayment
        ? { id: refundPayment.id, amount: paidAmount, currency: booking.currency }
        : null,
    };
  }

  async getCalendar(venueId: string, month: string) {
    // month format: YYYY-MM
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
  ): Promise<boolean> {
    const existing = await this.bookingRepo.findOne({
      where: {
        hallId,
        eventDate,
        timeSlot,
        status: Not(In(['cancelled'])),
      },
    });

    return !existing;
  }

  private async generateBookingNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.bookingRepo.count();
    return `BK-${year}-${String(count + 1).padStart(4, '0')}`;
  }
}
