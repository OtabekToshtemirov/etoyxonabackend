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
import { ExpenseCategory } from './expense-category.entity';
import { User } from '../../users/entities/user.entity';

@Entity('expenses')
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_id' })
  venueId: string;

  @Index()
  @Column({ type: 'uuid', name: 'category_id' })
  categoryId: string;

  @Column({ type: 'uuid', nullable: true, name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'uuid', name: 'created_by' })
  createdBy: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    name: 'exchange_rate',
  })
  exchangeRate: number;

  @Index()
  @Column({ type: 'date', name: 'expense_date' })
  expenseDate: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'receipt_url' })
  receiptUrl: string;

  @Column({ type: 'varchar', length: 20, default: 'approved' })
  status: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', name: 'deleted_at' })
  deletedAt: Date;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => ExpenseCategory)
  @JoinColumn({ name: 'category_id' })
  category: ExpenseCategory;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;
}
