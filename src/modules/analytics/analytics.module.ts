import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Hall } from '../halls/entities/hall.entity';
import { Client } from '../clients/entities/client.entity';
import { VenueEventType } from '../event-types/entities/event-type.entity';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Payment, Hall, Client, VenueEventType]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
