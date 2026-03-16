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
import { MenuPackageItem } from './menu-package-item.entity';

@Entity('menu_packages')
export class MenuPackage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'name_ru' })
  nameRu: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Narxlash
  @Column({
    type: 'decimal',
    precision: 12,
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

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'standard' })
  tier: string; // economy, standard, premium, vip, custom

  @Column({ type: 'text', nullable: true, name: 'includes_description' })
  includesDescription: string;

  @Column({ type: 'integer', default: 50, name: 'min_guests' })
  minGuests: number;

  @Column({ type: 'integer', nullable: true, name: 'max_guests' })
  maxGuests: number;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
  imageUrl: string;

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

  @OneToMany(() => MenuPackageItem, (item) => item.package)
  items: MenuPackageItem[];
}
