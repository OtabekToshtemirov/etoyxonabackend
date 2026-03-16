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
import { Booking } from './booking.entity';
import { VenueService } from '../../services/entities/venue-service.entity';

@Entity('booking_services')
export class BookingService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'uuid', name: 'venue_service_id' })
  venueServiceId: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'selected_variant' })
  selectedVariant: string;

  // Narxlash
  @Column({ type: 'varchar', length: 20, name: 'pricing_type' })
  pricingType: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'unit_price' })
  unitPrice: number;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_price' })
  totalPrice: number;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 20, default: 'confirmed' })
  status: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Booking, (booking) => booking.services, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => VenueService)
  @JoinColumn({ name: 'venue_service_id' })
  venueService: VenueService;
}
