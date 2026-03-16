import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

/**
 * Har bir to'yxonaning alohida to'lov sozlamalari.
 * 
 * To'yxona egasi Settings sahifasida o'z Payme/Click
 * merchant kalitlarini kiritadi. Pul to'g'ridan-to'g'ri
 * shu to'yxonaning Payme/Click hisobiga tushadi.
 * 
 * Biz faqat qancha pul tushganini ko'rsatamiz (statistika).
 */
@Entity('venue_payment_settings')
export class VenuePaymentSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  // ─── Payme sozlamalari ──────────────────────────
  @Column({ type: 'boolean', default: false, name: 'payme_enabled' })
  paymeEnabled: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'payme_merchant_id' })
  paymeMerchantId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'payme_merchant_key' })
  paymeMerchantKey: string | null;

  @Column({ type: 'boolean', default: true, name: 'payme_test_mode' })
  paymeTestMode: boolean;

  // ─── Click sozlamalari ──────────────────────────
  @Column({ type: 'boolean', default: false, name: 'click_enabled' })
  clickEnabled: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'click_merchant_id' })
  clickMerchantId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'click_service_id' })
  clickServiceId: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'click_secret_key' })
  clickSecretKey: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;
}
