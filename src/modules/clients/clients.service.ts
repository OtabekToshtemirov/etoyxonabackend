import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaginationDto } from '../../common/dto';
import { normalizePhone } from '../../common/utils/phone.util';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async create(venueId: string, data: Partial<Client>) {
    if (data.phone) {
      data.phone = normalizePhone(data.phone);
      // duplicate guard within same venue
      const existing = await this.clientRepo.findOne({
        where: { venueId, phone: data.phone },
      });
      if (existing) {
        throw new ConflictException(
          'Bu telefon raqamga ega mijoz allaqachon mavjud',
        );
      }
    }
    const client = this.clientRepo.create({ ...data, venueId });
    return this.clientRepo.save(client);
  }

  async findAll(venueId: string, pagination: PaginationDto) {
    const { page, limit, skip, search } = pagination;

    const qb = this.clientRepo
      .createQueryBuilder('client')
      .where('client.venueId = :venueId', { venueId });

    if (search) {
      // Try to normalize search if it looks like a phone number, so
      // searching "+998 90 ..." matches stored "+998901234567".
      const looksLikePhone = /[\d+\-\s()]+/.test(search) && /\d/.test(search);
      const normalizedSearch = looksLikePhone ? normalizePhone(search) : search;
      qb.andWhere(
        '(client.fullName ILIKE :search OR client.phone ILIKE :search OR client.phone ILIKE :normalized)',
        { search: `%${search}%`, normalized: `%${normalizedSearch}%` },
      );
    }

    qb.orderBy('client.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(venueId: string, id: string) {
    const client = await this.clientRepo.findOne({ where: { id, venueId } });
    if (!client) throw new NotFoundException('Mijoz topilmadi');

    // Load bookings for this client
    const bookings = await this.bookingRepo.find({
      where: { clientId: id, venueId },
      relations: ['hall'],
      order: { eventDate: 'DESC' },
    });

    // Load payments for this client's bookings (single IN query, no N+1)
    const bookingIds = bookings.map((b) => b.id);
    let payments: Payment[] = [];
    if (bookingIds.length > 0) {
      payments = await this.paymentRepo.find({
        where: { bookingId: In(bookingIds) },
        order: { createdAt: 'DESC' },
      });
    }

    return { ...client, bookings, payments };
  }

  async update(venueId: string, id: string, data: Partial<Client>) {
    await this.findOne(venueId, id);
    if (data.phone) {
      data.phone = normalizePhone(data.phone);
      const existing = await this.clientRepo.findOne({
        where: { venueId, phone: data.phone },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Bu telefon raqamga ega boshqa mijoz mavjud',
        );
      }
    }
    delete (data as any).venueId;
    await this.clientRepo.update({ id, venueId }, data);
    return this.findOne(venueId, id);
  }

  async remove(venueId: string, id: string) {
    await this.findOne(venueId, id);
    await this.clientRepo.softDelete({ id, venueId });
    return { message: "Mijoz o'chirildi" };
  }
}
