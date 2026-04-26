import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { VenueService } from './entities/venue-service.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServiceCategory)
    private readonly categoryRepo: Repository<ServiceCategory>,
    @InjectRepository(VenueService)
    private readonly serviceRepo: Repository<VenueService>,
  ) {}

  // ─── Categories (GLOBAL — admin only) ─────────────
  async findCategories() {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async createCategory(data: Partial<ServiceCategory>) {
    const category = this.categoryRepo.create(data);
    return this.categoryRepo.save(category);
  }

  async updateCategory(id: string, data: Partial<ServiceCategory>) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
    await this.categoryRepo.update(id, data);
    return this.categoryRepo.findOne({ where: { id } });
  }

  async removeCategory(id: string) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
    // Check if any services use this category (including soft-deleted)
    const count = await this.serviceRepo.count({ where: { categoryId: id }, withDeleted: true });
    if (count > 0) {
      throw new BadRequestException(`Bu kategoriyada ${count} ta xizmat bor. Avval xizmatlarni boshqa kategoriyaga o'tkazing.`);
    }
    await this.categoryRepo.delete(id);
    return { message: "Kategoriya o'chirildi" };
  }

  // ─── Venue Services (per-tenant) ──────────────────
  async create(venueId: string, data: Partial<VenueService>) {
    const service = this.serviceRepo.create({ ...data, venueId });
    return this.serviceRepo.save(service);
  }

  async findAllByVenue(venueId: string, categoryId?: string) {
    const where: any = { venueId, isAvailable: true };
    if (categoryId) where.categoryId = categoryId;

    return this.serviceRepo.find({
      where,
      relations: ['category'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(venueId: string, id: string) {
    const service = await this.serviceRepo.findOne({
      where: { id, venueId },
      relations: ['category'],
    });
    if (!service) throw new NotFoundException('Xizmat topilmadi');
    return service;
  }

  async update(venueId: string, id: string, data: Partial<VenueService>) {
    await this.findOne(venueId, id);
    delete (data as any).venueId;
    await this.serviceRepo.update({ id, venueId }, data);
    return this.findOne(venueId, id);
  }

  async remove(venueId: string, id: string) {
    await this.findOne(venueId, id);
    await this.serviceRepo.softDelete({ id, venueId });
    return { message: "Xizmat o'chirildi" };
  }
}
