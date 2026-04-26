import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenuePackagesController } from './venue-packages.controller';
import { VenuePackagesService } from './venue-packages.service';
import { VenuePackage } from './entities/venue-package.entity';
import { VenuePackageItem } from './entities/venue-package-item.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { VenueService } from '../services/entities/venue-service.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VenuePackage, VenuePackageItem, MenuItem, VenueService])],
  controllers: [VenuePackagesController],
  providers: [VenuePackagesService],
  exports: [VenuePackagesService],
})
export class VenuePackagesModule {}
