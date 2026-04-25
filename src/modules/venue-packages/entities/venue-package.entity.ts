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
import { VenuePackageItem } from './venue-package-item.entity';

@Entity('venue_packages')
export class VenuePackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Narxlash - Umumiy narx 1 kishi uchun (zal + menyu + xizmatlar)
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'price_per_person',
  })
  pricePerPerson: number;

  @Column({
    type: 'varchar',
    length: 3,
    default: 'UZS',
    name: 'price_currency',
  })
  priceCurrency: string;

  // Tarkibiy narxlar (faqat menyu narxi qoldi)
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'menu_price_per_person',
  })
  menuPricePerPerson: number;

  // Daraja
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'standard' })
  tier: string; // economy, standard, premium, vip

  @Column({ type: 'integer', nullable: true, name: 'max_guests' })
  maxGuests: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_popular' })
  isPopular: boolean;

  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => VenuePackageItem, (item) => item.venuePackage, { cascade: true })
  items: VenuePackageItem[];
}
