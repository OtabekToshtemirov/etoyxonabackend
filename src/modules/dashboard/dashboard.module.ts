import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Client } from '../clients/entities/client.entity';
import { Expense } from '../finance/entities/expense.entity';
import { ExpenseCategory } from '../finance/entities/expense-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Payment, Client, Expense, ExpenseCategory])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
