import { Injectable, NotFoundException } from '@nestjs/common';
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

  // ─── Categories ───────────────────────────────────
  async findCategories() {
    return this.categoryRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  // ─── Venue Services ──────────────────────────────
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

  async findOne(id: string) {
    const service = await this.serviceRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!service) throw new NotFoundException('Xizmat topilmadi');
    return service;
  }

  async update(id: string, data: Partial<VenueService>) {
    await this.findOne(id);
    await this.serviceRepo.update(id, data);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.serviceRepo.softDelete(id);
    return { message: 'Xizmat o\'chirildi' };
  }
}
