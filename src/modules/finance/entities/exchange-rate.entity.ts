import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('exchange_rates')
@Index(['fromCurrency', 'toCurrency', 'date', 'source'], { unique: true })
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 3, name: 'from_currency' })
  fromCurrency: string;

  @Column({ type: 'varchar', length: 3, name: 'to_currency' })
  toCurrency: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  rate: number;

  @Column({ type: 'varchar', length: 20, default: 'cbu' })
  source: string; // 'cbu' or 'manual'

  @Index()
  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;
}
