import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('halls')
export class Hall {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Sig'im
  @Column({ type: 'integer', name: 'min_capacity' })
  minCapacity: number;

  @Index()
  @Column({ type: 'integer', name: 'max_capacity' })
  maxCapacity: number;

  // Narxlash
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'hall_price',
    default: 0,
  })
  hallPrice: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS', name: 'price_currency' })
  priceCurrency: string;

  // Xususiyatlar
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true, name: 'area_sqm' })
  areaSqm: number;

  @Column({ type: 'integer', nullable: true })
  floor: number;

  @Column({ type: 'boolean', default: false, name: 'has_stage' })
  hasStage: boolean;

  @Column({ type: 'boolean', default: false, name: 'has_parking' })
  hasParking: boolean;

  @Column({ type: 'integer', default: 0, name: 'parking_capacity' })
  parkingCapacity: number;

  // Vaqt slotlari
  @Column({ type: 'jsonb', default: '[]', name: 'time_slots' })
  timeSlots: Array<{
    id: string;
    name: string;
    start: string;
    end: string;
  }>;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Venue, (venue) => venue.halls, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;
}
