import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuPackage } from './entities/menu-package.entity';
import { MenuPackageItem } from './entities/menu-package-item.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuCategory)
    private readonly categoryRepo: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly itemRepo: Repository<MenuItem>,
    @InjectRepository(MenuPackage)
    private readonly packageRepo: Repository<MenuPackage>,
    @InjectRepository(MenuPackageItem)
    private readonly packageItemRepo: Repository<MenuPackageItem>,
  ) {}

  // ─── Categories ───────────────────────────────────
  async createCategory(venueId: string, data: Partial<MenuCategory>) {
    const category = this.categoryRepo.create({ ...data, venueId });
    return this.categoryRepo.save(category);
  }

  async findCategories(venueId: string) {
    return this.categoryRepo.find({
      where: { venueId, isActive: true },
      relations: ['items'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findOneCategory(venueId: string, id: string) {
    const category = await this.categoryRepo.findOne({ where: { id, venueId } });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
    return category;
  }

  async updateCategory(venueId: string, id: string, data: Partial<MenuCategory>) {
    await this.findOneCategory(venueId, id);
    // never allow venueId change
    delete (data as any).venueId;
    await this.categoryRepo.update({ id, venueId }, data);
    return this.categoryRepo.findOne({ where: { id, venueId } });
  }

  async removeCategory(venueId: string, id: string) {
    await this.findOneCategory(venueId, id);
    // Check if any items reference this category (including soft-deleted)
    const count = await this.itemRepo.count({ where: { categoryId: id, venueId }, withDeleted: true });
    if (count > 0) {
      throw new BadRequestException(`Bu kategoriyada ${count} ta taom bor. Avval taomlarni boshqa kategoriyaga o'tkazing.`);
    }
    await this.categoryRepo.delete({ id, venueId });
    return { message: "Kategoriya o'chirildi" };
  }

  // ─── Items ────────────────────────────────────────
  async createItem(venueId: string, data: Partial<MenuItem>) {
    // Validate category belongs to same venue if set
    if (data.categoryId) {
      const cat = await this.categoryRepo.findOne({
        where: { id: data.categoryId, venueId },
      });
      if (!cat) throw new BadRequestException("Kategoriya topilmadi yoki boshqa to'yxonaga tegishli");
    }
    const item = this.itemRepo.create({ ...data, venueId });
    return this.itemRepo.save(item);
  }

  async findItems(venueId: string, categoryId?: string, includeUnavailable = false) {
    const where: any = { venueId };
    if (categoryId) where.categoryId = categoryId;
    // Default — faqat available taomlar (bron formada ishlatiladi)
    if (!includeUnavailable) where.isAvailable = true;

    return this.itemRepo.find({
      where,
      relations: ['category'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findOneItem(venueId: string, id: string) {
    const item = await this.itemRepo.findOne({
      where: { id, venueId },
      relations: ['category'],
    });
    if (!item) throw new NotFoundException('Taom topilmadi');
    return item;
  }

  async updateItem(venueId: string, id: string, data: Partial<MenuItem>) {
    await this.findOneItem(venueId, id);
    if (data.categoryId) {
      const cat = await this.categoryRepo.findOne({
        where: { id: data.categoryId, venueId },
      });
      if (!cat) throw new BadRequestException("Kategoriya topilmadi yoki boshqa to'yxonaga tegishli");
    }
    delete (data as any).venueId;
    await this.itemRepo.update({ id, venueId }, data);
    return this.findOneItem(venueId, id);
  }

  async removeItem(venueId: string, id: string) {
    await this.findOneItem(venueId, id);
    await this.itemRepo.softDelete({ id, venueId });
    return { message: "Taom o'chirildi" };
  }

  // ─── Packages ─────────────────────────────────────
  async createPackage(venueId: string, data: Partial<MenuPackage>) {
    const pkg = this.packageRepo.create({ ...data, venueId });
    return this.packageRepo.save(pkg);
  }

  async findPackages(venueId: string) {
    return this.packageRepo.find({
      where: { venueId, isActive: true },
      relations: ['items', 'items.menuItem'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findOnePackage(venueId: string, id: string) {
    const pkg = await this.packageRepo.findOne({
      where: { id, venueId },
      relations: ['items', 'items.menuItem'],
    });
    if (!pkg) throw new NotFoundException('Paket topilmadi');
    return pkg;
  }

  async updatePackage(venueId: string, id: string, data: Partial<MenuPackage>) {
    await this.findOnePackage(venueId, id);
    delete (data as any).venueId;
    await this.packageRepo.update({ id, venueId }, data);
    return this.findOnePackage(venueId, id);
  }

  async removePackage(venueId: string, id: string) {
    await this.findOnePackage(venueId, id);
    await this.packageRepo.softDelete({ id, venueId });
    return { message: "Paket o'chirildi" };
  }

  async addPackageItem(venueId: string, packageId: string, data: Partial<MenuPackageItem>) {
    // ensure package is in this venue
    await this.findOnePackage(venueId, packageId);
    // ensure menuItem (if provided) is in this venue
    if (data.menuItemId) {
      const mi = await this.itemRepo.findOne({ where: { id: data.menuItemId, venueId } });
      if (!mi) throw new BadRequestException("Taom topilmadi yoki boshqa to'yxonaga tegishli");
    }
    const item = this.packageItemRepo.create({ ...data, packageId });
    return this.packageItemRepo.save(item);
  }

  async removePackageItem(venueId: string, packageId: string, id: string) {
    // verify parent package belongs to venue
    await this.findOnePackage(venueId, packageId);
    await this.packageItemRepo.delete({ id, packageId });
    return { message: "Element o'chirildi" };
  }
}
