import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';
import { MenuItem } from '../../menu/entities/menu-item.entity';

@Entity('booking_menu_items')
export class BookingMenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @Column({ type: 'uuid', name: 'menu_item_id' })
  menuItemId: string;

  // Snapshot — taom o'chirilsa ham nomi qoladi
  @Column({ type: 'varchar', length: 200, nullable: true, name: 'menu_item_name' })
  menuItemName: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'price_per_person',
  })
  pricePerPerson: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_price' })
  totalPrice: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes: string;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Booking, (booking) => booking.menuItems, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => MenuItem)
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;
}
