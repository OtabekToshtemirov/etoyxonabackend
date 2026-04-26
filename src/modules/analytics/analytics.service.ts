import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Hall } from '../halls/entities/hall.entity';
import { Client } from '../clients/entities/client.entity';
import { VenueEventType } from '../event-types/entities/event-type.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Hall) private readonly hallRepo: Repository<Hall>,
    @InjectRepository(Client) private readonly clientRepo: Repository<Client>,
    @InjectRepository(VenueEventType)
    private readonly eventTypeRepo: Repository<VenueEventType>,
  ) {}

  async getOverview(venueId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );
    // 6 oy oldingi birinchi kun (YYYY-MM-01)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const sixMonthsAgoDate = sixMonthsAgo.toISOString().split('T')[0];

    const [
      totalBookings,
      monthBookings,
      totalClients,
      monthRevenue,
      bookingsByStatus,
    ] = await Promise.all([
      this.bookingRepo.count({ where: { venueId } }),
      // Joriy oy uchun bronlar
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.venueId = :venueId', { venueId })
        .andWhere('b.eventDate BETWEEN :start AND :end', {
          start: startOfMonth.toISOString().split('T')[0],
          end: endOfMonth.toISOString().split('T')[0],
        })
        .getCount(),
      this.clientRepo.count({ where: { venueId } }),
      this.paymentRepo
        .createQueryBuilder('p')
        .select('SUM(p.amount)', 'total')
        .where('p.venueId = :venueId', { venueId })
        .andWhere('p.status = :status', { status: 'completed' })
        .andWhere('p.paymentType = :type', { type: 'payment' })
        .andWhere('p.paidAt BETWEEN :start AND :end', {
          start: startOfMonth,
          end: endOfMonth,
        })
        .getRawOne(),
      this.bookingRepo
        .createQueryBuilder('b')
        .select('b.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('b.venueId = :venueId', { venueId })
        .groupBy('b.status')
        .getRawMany(),
    ]);

    const monthlyTrend = await this.getMonthlyTrend(venueId, sixMonthsAgo);

    // Event type distribution — slug bilan birga nom va rang ham qo'shamiz
    const eventTypeRaw = await this.bookingRepo
      .createQueryBuilder('b')
      .select('b.eventType', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('b.venueId = :venueId', { venueId })
      .andWhere('b.status != :cancelled', { cancelled: 'cancelled' })
      .groupBy('b.eventType')
      .getRawMany();

    const venueEventTypes = await this.eventTypeRepo.find({
      where: { venueId },
    });
    const eventTypeMap = new Map(
      venueEventTypes.map((e) => [e.slug, { name: e.name, color: e.color }]),
    );

    const eventTypeStats = eventTypeRaw.map((e) => {
      const meta = eventTypeMap.get(e.eventType);
      return {
        eventType: e.eventType,
        name: meta?.name || e.eventType,
        color: meta?.color || null,
        count: Number(e.count),
      };
    });

    const hallStats = await this.bookingRepo
      .createQueryBuilder('b')
      .select('h.name', 'hallName')
      .addSelect('COUNT(*)', 'bookingCount')
      .addSelect('SUM(b.totalAmount)', 'revenue')
      .innerJoin('b.hall', 'h')
      .where('b.venueId = :venueId', { venueId })
      .andWhere('b.status != :cancelled', { cancelled: 'cancelled' })
      .groupBy('h.id, h.name')
      .orderBy('COUNT(*)', 'DESC')
      .limit(5)
      .getRawMany();

    const monthlyStats = await this.bookingRepo
      .createQueryBuilder('b')
      .select("TO_CHAR(b.eventDate, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'bookings')
      .addSelect('SUM(b.totalAmount)', 'revenue')
      .where('b.venueId = :venueId', { venueId })
      .andWhere('b.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('b.eventDate >= :since', { since: sixMonthsAgoDate })
      .groupBy("TO_CHAR(b.eventDate, 'YYYY-MM')")
      .orderBy("TO_CHAR(b.eventDate, 'YYYY-MM')", 'ASC')
      .getRawMany();

    const avgBookingValue = await this.bookingRepo
      .createQueryBuilder('b')
      .select('AVG(b.totalAmount)', 'avg')
      .where('b.venueId = :venueId', { venueId })
      .andWhere('b.status NOT IN (:...statuses)', { statuses: ['cancelled'] })
      .getRawOne();

    return {
      kpi: {
        totalBookings,
        monthBookings,
        totalClients,
        monthRevenue: Number(monthRevenue?.total) || 0,
        avgBookingValue: Math.round(Number(avgBookingValue?.avg) || 0),
      },
      bookingsByStatus: bookingsByStatus.map((s) => ({
        status: s.status,
        count: Number(s.count),
      })),
      monthlyTrend,
      eventTypeStats,
      hallStats: hallStats.map((h) => ({
        hallName: h.hallName,
        bookingCount: Number(h.bookingCount),
        revenue: Math.round(Number(h.revenue) || 0),
      })),
      monthlyStats: monthlyStats.map((m) => ({
        month: m.month,
        bookings: Number(m.bookings),
        revenue: Math.round(Number(m.revenue) || 0),
      })),
    };
  }

  private async getMonthlyTrend(venueId: string, since: Date) {
    // Convert paid_at to Asia/Tashkent for correct month bucketing
    const monthExpr = "TO_CHAR(p.paid_at AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM')";
    const result = await this.paymentRepo
      .createQueryBuilder('p')
      .select(monthExpr, 'month')
      .addSelect('SUM(p.amount)', 'revenue')
      .where('p.venueId = :venueId', { venueId })
      .andWhere('p.status = :status', { status: 'completed' })
      .andWhere('p.paymentType = :type', { type: 'payment' })
      .andWhere('p.paidAt >= :since', { since })
      .groupBy(monthExpr)
      .orderBy(monthExpr, 'ASC')
      .getRawMany();

    return result.map((r) => ({
      month: r.month,
      revenue: Math.round(Number(r.revenue) || 0),
    }));
  }
}
