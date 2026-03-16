import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuPackage } from './entities/menu-package.entity';
import { MenuPackageItem } from './entities/menu-package-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MenuCategory,
      MenuItem,
      MenuPackage,
      MenuPackageItem,
    ]),
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
