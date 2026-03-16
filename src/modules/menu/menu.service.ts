import { Injectable, NotFoundException } from '@nestjs/common';
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

  async updateCategory(id: string, data: Partial<MenuCategory>) {
    await this.categoryRepo.update(id, data);
    return this.categoryRepo.findOne({ where: { id } });
  }

  async removeCategory(id: string) {
    await this.categoryRepo.delete(id);
    return { message: 'Kategoriya o\'chirildi' };
  }

  // ─── Items ────────────────────────────────────────
  async createItem(venueId: string, data: Partial<MenuItem>) {
    const item = this.itemRepo.create({ ...data, venueId });
    return this.itemRepo.save(item);
  }

  async findItems(venueId: string, categoryId?: string) {
    const where: any = { venueId };
    if (categoryId) where.categoryId = categoryId;

    return this.itemRepo.find({
      where,
      relations: ['category'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findOneItem(id: string) {
    const item = await this.itemRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!item) throw new NotFoundException('Taom topilmadi');
    return item;
  }

  async updateItem(id: string, data: Partial<MenuItem>) {
    await this.findOneItem(id);
    await this.itemRepo.update(id, data);
    return this.findOneItem(id);
  }

  async removeItem(id: string) {
    await this.itemRepo.softDelete(id);
    return { message: 'Taom o\'chirildi' };
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

  async findOnePackage(id: string) {
    const pkg = await this.packageRepo.findOne({
      where: { id },
      relations: ['items', 'items.menuItem'],
    });
    if (!pkg) throw new NotFoundException('Paket topilmadi');
    return pkg;
  }

  async updatePackage(id: string, data: Partial<MenuPackage>) {
    await this.findOnePackage(id);
    await this.packageRepo.update(id, data);
    return this.findOnePackage(id);
  }

  async removePackage(id: string) {
    await this.packageRepo.softDelete(id);
    return { message: 'Paket o\'chirildi' };
  }

  async addPackageItem(packageId: string, data: Partial<MenuPackageItem>) {
    const item = this.packageItemRepo.create({ ...data, packageId });
    return this.packageItemRepo.save(item);
  }

  async removePackageItem(id: string) {
    await this.packageItemRepo.delete(id);
    return { message: 'Element o\'chirildi' };
  }
}
