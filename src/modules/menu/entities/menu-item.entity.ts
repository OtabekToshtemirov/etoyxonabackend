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
import { MenuCategory } from './menu-category.entity';

@Entity('menu_items')
export class MenuItem {
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

  @Column({ type: 'varchar', length: 20, default: 'person' })
  unit: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'portion_size' })
  portionSize: string;

  // Xususiyatlar
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
  imageUrl: string;

  @Index()
  @Column({ type: 'boolean', default: true, name: 'is_available' })
  isAvailable: boolean;

  @Column({ type: 'boolean', default: false, name: 'is_seasonal' })
  isSeasonal: boolean;

  @Column({ type: 'text', nullable: true })
  ingredients: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  allergens: string;

  @Column({ type: 'boolean', default: true, name: 'is_halal' })
  isHalal: boolean;

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

  @ManyToOne(() => MenuCategory, (cat) => cat.items)
  @JoinColumn({ name: 'category_id' })
  category: MenuCategory;
}
