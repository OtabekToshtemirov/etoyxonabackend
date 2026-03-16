import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VenuePackage } from './entities/venue-package.entity';
import { VenuePackageItem } from './entities/venue-package-item.entity';
import { CreateVenuePackageDto, UpdateVenuePackageDto } from './dto';

@Injectable()
export class VenuePackagesService {
  constructor(
    @InjectRepository(VenuePackage)
    private readonly packageRepo: Repository<VenuePackage>,
    @InjectRepository(VenuePackageItem)
    private readonly packageItemRepo: Repository<VenuePackageItem>,
  ) {}

  async create(venueId: string, data: CreateVenuePackageDto) {
    const { items, ...packageData } = data;

    const venuePackage = this.packageRepo.create({
      ...packageData,
      venueId,
    });

    const savedPackage = await this.packageRepo.save(venuePackage);

    // Save items
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await this.packageItemRepo.save({
          venuePackageId: savedPackage.id,
          type: item.type,
          menuItemId: item.type === 'menu_item' ? (item.menuItemId || null) : null,
          venueServiceId: item.type === 'service' ? (item.venueServiceId || null) : null,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          notes: item.notes || null,
          sortOrder: item.sortOrder ?? i,
        } as VenuePackageItem);
      }
    }

    return this.findOne(savedPackage.id);
  }

  async findAll(venueId: string) {
    return this.packageRepo.find({
      where: { venueId },
      relations: ['items', 'items.menuItem', 'items.venueService'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const pkg = await this.packageRepo.findOne({
      where: { id },
      relations: ['items', 'items.menuItem', 'items.venueService'],
    });
    if (!pkg) throw new NotFoundException('Paket topilmadi');
    return pkg;
  }

  async update(id: string, data: UpdateVenuePackageDto) {
    const pkg = await this.findOne(id);
    const { items, ...packageData } = data;

    Object.assign(pkg, packageData);
    await this.packageRepo.save(pkg);

    // Replace items if provided
    if (items !== undefined) {
      // Delete existing items
      await this.packageItemRepo.delete({ venuePackageId: id });

      // Create new items
      if (items.length) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          await this.packageItemRepo.save({
            venuePackageId: id,
            type: item.type,
            menuItemId: item.type === 'menu_item' ? (item.menuItemId || null) : null,
            venueServiceId: item.type === 'service' ? (item.venueServiceId || null) : null,
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            notes: item.notes || null,
            sortOrder: item.sortOrder ?? i,
          } as VenuePackageItem);
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const pkg = await this.findOne(id);
    await this.packageRepo.softDelete(id);
    return { message: 'Paket o\'chirildi' };
  }
}
