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
import { ServiceCategory } from './service-category.entity';

@Entity('venue_services')
export class VenueService {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Index()
  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'name_ru' })
  nameRu: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Narxlash
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'fixed', name: 'pricing_type' })
  pricingType: string; // fixed, per_person, per_hour, per_unit, package

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS', name: 'price_currency' })
  priceCurrency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'min_price' })
  minPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true, name: 'max_price' })
  maxPrice: number;

  // Variantlar
  @Column({ type: 'jsonb', default: '[]' })
  variants: Array<{ name: string; price: number }>;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
  imageUrl: string;

  @Column({ type: 'jsonb', default: '[]' })
  images: string[];

  // Mavjudlik
  @Column({ type: 'boolean', default: true, name: 'is_available' })
  isAvailable: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_included_free' })
  isIncludedFree: boolean;

  @Column({ type: 'jsonb', default: '[]', name: 'included_in_hall_ids' })
  includedInHallIds: string[];

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

  @ManyToOne(() => ServiceCategory)
  @JoinColumn({ name: 'category_id' })
  category: ServiceCategory;
}
