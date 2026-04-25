import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';
import { Hall } from '../../halls/entities/hall.entity';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { MenuPackage } from '../../menu/entities/menu-package.entity';
import { VenuePackage } from '../../venue-packages/entities/venue-package.entity';
import { BookingMenuItem } from './booking-menu-item.entity';
import { BookingService } from './booking-service.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 20, unique: true, name: 'booking_number' })
  bookingNumber: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Index()
  @Column({ type: 'uuid', name: 'hall_id' })
  hallId: string;

  @Index()
  @Column({ type: 'uuid', name: 'client_id' })
  clientId: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  // Sana va vaqt
  @Index()
  @Column({ type: 'date', name: 'event_date' })
  eventDate: string;

  @Column({ type: 'varchar', length: 20, name: 'time_slot' })
  timeSlot: string;

  @Column({ type: 'time', name: 'start_time' })
  startTime: string;

  @Column({ type: 'time', name: 'end_time' })
  endTime: string;

  // Mehmonlar
  @Column({ type: 'integer', name: 'guest_count' })
  guestCount: number;

  @Column({ type: 'integer', nullable: true, name: 'actual_guest_count' })
  actualGuestCount: number;

  // Tadbir turi
  @Column({ type: 'varchar', length: 30, default: 'wedding', name: 'event_type' })
  eventType: string;

  // Paket
  @Column({ type: 'uuid', nullable: true, name: 'venue_package_id' })
  venuePackageId: string;

  // Menyu
  @Column({ type: 'uuid', nullable: true, name: 'menu_package_id' })
  menuPackageId: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'menu_price_per_person',
  })
  menuPricePerPerson: number;

  // Valyuta
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
    precision: 15,
    scale: 2,
    default: 0,
    name: 'hall_price',
  })
  hallPrice: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'services_total',
  })
  servicesTotal: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'menu_total',
  })
  menuTotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'discount_amount',
  })
  discountAmount: number;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'discount_reason' })
  discountReason: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    nullable: true,
    name: 'total_amount_alt',
  })
  totalAmountAlt: number;

  // To'lov holati
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    name: 'paid_amount',
  })
  paidAmount: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    name: 'remaining_amount',
  })
  remainingAmount: number;

  // Status
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  // Izohlar
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true, name: 'internal_notes' })
  internalNotes: string;

  @Column({ type: 'text', nullable: true, name: 'cancellation_reason' })
  cancellationReason: string;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'cancelled_at',
  })
  cancelledAt: Date;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => Hall)
  @JoinColumn({ name: 'hall_id' })
  hall: Hall;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @ManyToOne(() => VenuePackage)
  @JoinColumn({ name: 'venue_package_id' })
  venuePackage: VenuePackage;

  @ManyToOne(() => MenuPackage)
  @JoinColumn({ name: 'menu_package_id' })
  menuPackage: MenuPackage;

  @OneToMany(() => BookingMenuItem, (bmi) => bmi.booking)
  menuItems: BookingMenuItem[];

  @OneToMany(() => BookingService, (bs) => bs.booking)
  services: BookingService[];

  @OneToMany(() => Payment, (p) => p.booking)
  payments: Payment[];
}
