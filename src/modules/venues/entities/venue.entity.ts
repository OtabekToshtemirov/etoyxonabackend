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
import { User } from '../../users/entities/user.entity';
import { VenueMember } from '../../users/entities/venue-member.entity';
import { Hall } from '../../halls/entities/hall.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 200, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Manzil
  @Index()
  @Column({ type: 'varchar', length: 100 })
  region: string;

  @Column({ type: 'varchar', length: 100 })
  district: string;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  landmark: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number;

  // Aloqa
  @Column({ type: 'varchar', length: 13, name: 'phone_primary' })
  phonePrimary: string;

  @Column({ type: 'varchar', length: 13, nullable: true, name: 'phone_secondary' })
  phoneSecondary: string;

  // Sozlamalar
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'boolean', default: false, name: 'is_verified' })
  isVerified: boolean;

  @Column({ type: 'jsonb', nullable: true, name: 'working_hours' })
  workingHours: { start: string; end: string };

  // Valyuta
  @Column({ type: 'varchar', length: 3, default: 'UZS', name: 'default_currency' })
  defaultCurrency: string;

  @Column({
    type: 'jsonb',
    default: '["UZS", "USD"]',
    name: 'supported_currencies',
  })
  supportedCurrencies: string[];

  @Column({ type: 'boolean', default: true, name: 'auto_exchange_rate' })
  autoExchangeRate: boolean;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'manual_usd_rate',
  })
  manualUsdRate: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'tax_percentage',
  })
  taxPercentage: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    name: 'discount_percentage',
  })
  discountPercentage: number;

  // Statistika
  @Column({ type: 'decimal', precision: 2, scale: 1, default: 0 })
  rating: number;

  @Column({ type: 'integer', default: 0, name: 'total_bookings' })
  totalBookings: number;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @OneToMany(() => VenueMember, (vm) => vm.venue)
  members: VenueMember[];

  @OneToMany(() => Hall, (hall) => hall.venue)
  halls: Hall[];
}
