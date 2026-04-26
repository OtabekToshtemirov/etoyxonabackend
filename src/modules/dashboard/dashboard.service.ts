import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Client } from '../clients/entities/client.entity';
import { Expense } from '../finance/entities/expense.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async getDashboard(venueId: string) {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';

    // Upcoming bookings
    const upcomingBookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.hall', 'hall')
      .leftJoinAndSelect('booking.client', 'client')
      .where('booking.venueId = :venueId', { venueId })
      .andWhere('booking.eventDate >= :today', { today })
      .andWhere('booking.status NOT IN (:...statuses)', {
        statuses: ['cancelled', 'completed'],
      })
      .orderBy('booking.eventDate', 'ASC')
      .take(10)
      .getMany();

    // Today's bookings
    const todayBookings = await this.bookingRepo.count({
      where: { venueId, eventDate: today },
    });

    // Monthly stats
    const monthlyBookings = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.venueId = :venueId', { venueId })
      .andWhere('booking.eventDate >= :monthStart', { monthStart })
      .andWhere('booking.status != :cancelled', { cancelled: 'cancelled' })
      .getCount();

    const monthlyIncome = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .addSelect('payment.currency', 'currency')
      .where('payment.venueId = :venueId', { venueId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paidAt >= :monthStart', { monthStart })
      .groupBy('payment.currency')
      .getRawMany();

    // Total clients
    const totalClients = await this.clientRepo.count({
      where: { venueId },
    });

    // Pending payments (bookings with remaining amount > 0)
    const pendingPayments = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.client', 'client')
      .where('booking.venueId = :venueId', { venueId })
      .andWhere('booking.remainingAmount > 0')
      .andWhere('booking.status NOT IN (:...statuses)', {
        statuses: ['cancelled'],
      })
      .orderBy('booking.eventDate', 'ASC')
      .take(5)
      .getMany();

    // Chart Data: Expenses by Category — group by id (name kategoriya bo'yicha takrorlanmasin)
    const expensesByCategory = await this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoin('expense.category', 'category')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('SUM(expense.amount)', 'value')
      .where('expense.venueId = :venueId', { venueId })
      .andWhere('expense.expenseDate >= :monthStart', { monthStart })
      .groupBy('category.id')
      .addGroupBy('category.name')
      .getRawMany();

    // Chart Data: Top Packages
    const topPackages = await this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoin('booking.venuePackage', 'venuePackage')
      .select('venuePackage.name', 'name')
      .addSelect('COUNT(booking.id)', 'value')
      .where('booking.venueId = :venueId', { venueId })
      .andWhere('booking.venuePackageId IS NOT NULL')
      .andWhere('booking.eventDate >= :monthStart', { monthStart })
      .groupBy('venuePackage.name')
      .orderBy('value', 'DESC')
      .take(5)
      .getRawMany();

    // Chart Data: Revenue vs Expense (Daily for current month)
    // Timezone: paid_at is timestamptz. Convert to Asia/Tashkent before extracting DATE
    // so kechqurun UTC paid_at correctly maps to next day in UZ time.
    const tz = 'Asia/Tashkent';
    const dailyIncome = await this.paymentRepo
      .createQueryBuilder('payment')
      .select(`DATE(payment.paid_at AT TIME ZONE '${tz}')`, 'date')
      .addSelect('SUM(payment.amount)', 'revenue')
      .where('payment.venueId = :venueId', { venueId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paidAt >= :monthStart', { monthStart })
      .groupBy(`DATE(payment.paid_at AT TIME ZONE '${tz}')`)
      .getRawMany();

    const dailyExpense = await this.expenseRepo
      .createQueryBuilder('expense')
      .select('DATE(expense.expenseDate)', 'date')
      .addSelect('SUM(expense.amount)', 'expense')
      .where('expense.venueId = :venueId', { venueId })
      .andWhere('expense.expenseDate >= :monthStart', { monthStart })
      .groupBy('DATE(expense.expenseDate)')
      .getRawMany();

    // Merge daily charts
    const chartMap = new Map();
    const daysInMonth = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const d = `${monthStart.substring(0,8)}${String(i).padStart(2, '0')}`;
        chartMap.set(d, { date: d, revenue: 0, expense: 0 });
    }

    dailyIncome.forEach(item => {
        // Handle timezone issues manually formatting to YYYY-MM-DD
        const dateStr = item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date;
        if(chartMap.has(dateStr)) {
            chartMap.get(dateStr).revenue = Number(item.revenue);
        }
    });

    dailyExpense.forEach(item => {
        const dateStr = item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date;
        if(chartMap.has(dateStr)) {
            chartMap.get(dateStr).expense = Number(item.expense);
        }
    });

    const incomeExpenseChart = Array.from(chartMap.values());

    return {
      today: todayBookings,
      upcomingBookings,
      monthlyBookings,
      monthlyIncome,
      totalClients,
      pendingPayments,
      expensesByCategory: expensesByCategory.map(e => ({ name: e.name || 'Boshqa', value: Number(e.value) })),
      topPackages: topPackages.map(p => ({ name: p.name || 'Noma\'lum', value: Number(p.value) })),
      incomeExpenseChart,
    };
  }
}
