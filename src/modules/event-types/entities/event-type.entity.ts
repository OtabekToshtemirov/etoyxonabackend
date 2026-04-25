import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('venue_event_types')
@Unique('UQ_venue_event_types_venue_slug', ['venueId', 'slug'])
export class VenueEventType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  slug: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Venue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;
}
