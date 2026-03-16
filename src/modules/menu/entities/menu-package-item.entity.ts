import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { MenuPackage } from './menu-package.entity';
import { MenuItem } from './menu-item.entity';

@Entity('menu_package_items')
@Unique(['package', 'menuItem'])
export class MenuPackageItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'package_id' })
  packageId: string;

  @Column({ type: 'uuid', name: 'menu_item_id' })
  menuItemId: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'boolean', default: false, name: 'is_optional' })
  isOptional: boolean;

  @Column({ type: 'varchar', length: 200, nullable: true })
  notes: string;

  @Column({ type: 'integer', default: 0, name: 'sort_order' })
  sortOrder: number;

  // Relations
  @ManyToOne(() => MenuPackage, (pkg) => pkg.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'package_id' })
  package: MenuPackage;

  @ManyToOne(() => MenuItem)
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: MenuItem;
}
