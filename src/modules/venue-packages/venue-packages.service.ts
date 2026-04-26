import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VenuePackage } from './entities/venue-package.entity';
import { VenuePackageItem } from './entities/venue-package-item.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { VenueService } from '../services/entities/venue-service.entity';
import { CreateVenuePackageDto, UpdateVenuePackageDto } from './dto';

@Injectable()
export class VenuePackagesService {
  constructor(
    @InjectRepository(VenuePackage)
    private readonly packageRepo: Repository<VenuePackage>,
    @InjectRepository(VenuePackageItem)
    private readonly packageItemRepo: Repository<VenuePackageItem>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepo: Repository<MenuItem>,
    @InjectRepository(VenueService)
    private readonly venueServiceRepo: Repository<VenueService>,
  ) {}

  /** Validate every item references this venue's own resources */
  private async validateItemsTenant(
    venueId: string,
    items: CreateVenuePackageDto['items'] | undefined,
  ) {
    if (!items?.length) return;
    for (const item of items) {
      if (item.type === 'menu_item' && item.menuItemId) {
        const exists = await this.menuItemRepo.findOne({
          where: { id: item.menuItemId, venueId },
        });
        if (!exists) {
          throw new BadRequestException(
            `Taom topilmadi yoki boshqa to'yxonaga tegishli: ${item.menuItemId}`,
          );
        }
      } else if (item.type === 'service' && item.venueServiceId) {
        const exists = await this.venueServiceRepo.findOne({
          where: { id: item.venueServiceId, venueId },
        });
        if (!exists) {
          throw new BadRequestException(
            `Xizmat topilmadi yoki boshqa to'yxonaga tegishli: ${item.venueServiceId}`,
          );
        }
      }
    }
  }

  async create(venueId: string, data: CreateVenuePackageDto) {
    const { items, ...packageData } = data;

    // Tenant validatsiyasi — items boshqa to'yxonaga tegishli bo'lmasin
    await this.validateItemsTenant(venueId, items);

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

    return this.findOne(venueId, savedPackage.id);
  }

  async findAll(venueId: string) {
    return this.packageRepo.find({
      where: { venueId },
      relations: ['items', 'items.menuItem', 'items.venueService'],
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(venueId: string, id: string) {
    const pkg = await this.packageRepo.findOne({
      where: { id, venueId },
      relations: ['items', 'items.menuItem', 'items.venueService'],
    });
    if (!pkg) throw new NotFoundException('Paket topilmadi');
    return pkg;
  }

  async update(venueId: string, id: string, data: UpdateVenuePackageDto) {
    const pkg = await this.findOne(venueId, id);
    const { items, ...packageData } = data;

    if (items !== undefined) {
      await this.validateItemsTenant(venueId, items);
    }

    delete (packageData as any).venueId;
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

    return this.findOne(venueId, id);
  }

  async remove(venueId: string, id: string) {
    await this.findOne(venueId, id);
    await this.packageRepo.softDelete({ id, venueId });
    return { message: "Paket o'chirildi" };
  }
}
