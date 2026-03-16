import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClickController } from './click.controller';
import { ClickService } from './click.service';
import { Payment } from '../entities/payment.entity';
import { VenuePaymentSettings } from '../entities/venue-payment-settings.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, VenuePaymentSettings, Booking])],
  controllers: [ClickController],
  providers: [ClickService],
  exports: [ClickService],
})
export class ClickModule {}
