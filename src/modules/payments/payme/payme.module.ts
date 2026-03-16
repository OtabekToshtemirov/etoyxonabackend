import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymeController } from './payme.controller';
import { PaymeService } from './payme.service';
import { Payment } from '../entities/payment.entity';
import { VenuePaymentSettings } from '../entities/venue-payment-settings.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, VenuePaymentSettings, Booking])],
  controllers: [PaymeController],
  providers: [PaymeService],
  exports: [PaymeService],
})
export class PaymeModule {}
