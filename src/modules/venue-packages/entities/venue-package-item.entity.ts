import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VenuePackage } from './venue-package.entity';
import { MenuItem } from '../../menu/entities/menu-item.entity';
import { VenueService } from '../../services/entities/venue-service.entity';

@Entity('venue_package_items')
export class VenuePackageItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'venue_package_id' })
  venuePackageId: string;

  // Tur: menu_item yoki service
  @Index()
  @Column({ type: 'varchar', length: 20 })
  type: string; // 'menu_item' | 'service'

  // Menyu taom uchun (agar type = menu_item)
  @Column({ type: 'uuid', nullable: true, name: 'menu_item_id' })
  menuItemId: string;

  // Xizmat uchun (agar type = service)
  @Column({ type: 'uuid', nullable: true, name: 'venue_service_id' })
  venueServiceId: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
    name: 'unit_price',
  })
  unitPrice: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes: string;

  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder: number;

  // Relations
  @ManyToOne(() => VenuePackage, (pkg) => pkg.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'venue_package_id' })
  venuePackage: VenuePackage;

  @ManyToOne(() => MenuItem, { nullable: true, eager: true })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;

  @ManyToOne(() => VenueService, { nullable: true, eager: true })
  @JoinColumn({ name: 'venue_service_id' })
  venueService: VenueService;
}
