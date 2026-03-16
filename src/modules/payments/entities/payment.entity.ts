import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 20, unique: true, name: 'payment_number' })
  paymentNumber: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Index()
  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'uuid', name: 'client_id' })
  clientId: string;

  @Column({ type: 'uuid', nullable: true, name: 'received_by' })
  receivedBy: string;

  // Summa va valyuta
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'exchange_rate',
  })
  exchangeRate: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    name: 'amount_in_base',
  })
  amountInBase: number;

  // To'lov usuli
  @Index()
  @Column({ type: 'varchar', length: 20, name: 'payment_method' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 20, default: 'payment', name: 'payment_type' })
  paymentType: string;

  // Onlayn to'lov
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'transaction_id' })
  transactionId: string;

  @Column({ type: 'jsonb', nullable: true, name: 'provider_data' })
  providerData: any;

  // Status
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes: string;

  @Index()
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'paid_at',
  })
  paidAt: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Booking, (booking) => booking.payments)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'received_by' })
  receiver: User;
}
