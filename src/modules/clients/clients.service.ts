import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { PaginationDto } from '../../common/dto';

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
    const client = this.clientRepo.create({ ...data, venueId });
    return this.clientRepo.save(client);
  }

  async findAll(venueId: string, pagination: PaginationDto) {
    const { page, limit, skip, search } = pagination;

    const qb = this.clientRepo
      .createQueryBuilder('client')
      .where('client.venueId = :venueId', { venueId });

    if (search) {
      qb.andWhere(
        '(client.fullName ILIKE :search OR client.phone ILIKE :search)',
        { search: `%${search}%` },
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

    // Load payments for this client's bookings
    const bookingIds = bookings.map((b) => b.id);
    let payments: Payment[] = [];
    if (bookingIds.length > 0) {
      payments = await this.paymentRepo.find({
        where: bookingIds.map((bid) => ({ bookingId: bid })),
        order: { createdAt: 'DESC' },
      });
    }

    return { ...client, bookings, payments };
  }

  async update(venueId: string, id: string, data: Partial<Client>) {
    await this.findOne(venueId, id);
    await this.clientRepo.update(id, data);
    return this.findOne(venueId, id);
  }

  async remove(venueId: string, id: string) {
    await this.findOne(venueId, id);
    await this.clientRepo.softDelete(id);
    return { message: 'Mijoz o\'chirildi' };
  }
}
