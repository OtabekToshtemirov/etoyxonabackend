import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Venue } from '../../venues/entities/venue.entity';

@Entity('venue_members')
@Unique(['user', 'venue'])
export class VenueMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  role: string; // 'owner', 'manager', 'staff'

  @Column({ type: 'varchar', length: 50, nullable: true })
  position: string;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Column({
    type: 'timestamp with time zone',
    default: () => 'NOW()',
    name: 'joined_at',
  })
  joinedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.venueMembers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Venue, (venue) => venue.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;
}
