import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment } from './entities/payment.entity';
import { VenuePaymentSettings } from './entities/venue-payment-settings.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Client } from '../clients/entities/client.entity';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, VenuePaymentSettings, Booking, Client]),
    SmsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
