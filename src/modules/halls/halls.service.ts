import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hall } from './entities/hall.entity';
import { CreateHallDto } from './dto/create-hall.dto';
import { UpdateHallDto } from './dto/update-hall.dto';

@Injectable()
export class HallsService {
  constructor(
    @InjectRepository(Hall)
    private readonly hallRepo: Repository<Hall>,
  ) {}

  async create(venueId: string, dto: CreateHallDto) {
    const hall = this.hallRepo.create({ ...dto, venueId });
    return this.hallRepo.save(hall);
  }

  async findAllByVenue(venueId: string) {
    return this.hallRepo.find({
      where: { venueId, status: 'active' },
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(id: string) {
    const hall = await this.hallRepo.findOne({ where: { id } });
    if (!hall) throw new NotFoundException('Zal topilmadi');
    return hall;
  }

  async update(id: string, dto: UpdateHallDto) {
    const hall = await this.findOne(id);
    Object.assign(hall, dto);
    return this.hallRepo.save(hall);
  }

  async remove(id: string) {
    await this.hallRepo.softDelete(id);
    return { message: 'Zal o\'chirildi' };
  }
}
