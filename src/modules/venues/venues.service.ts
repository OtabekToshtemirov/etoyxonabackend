import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from './entities/venue.entity';
import { VenueMember } from '../users/entities/venue-member.entity';
import { User } from '../users/entities/user.entity';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { AddVenueMemberDto, UpdateVenueMemberDto } from './dto/venue-member.dto';
import { PaginationDto } from '../../common/dto';

@Injectable()
export class VenuesService {
  constructor(
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(VenueMember)
    private readonly venueMemberRepo: Repository<VenueMember>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(ownerId: string, dto: CreateVenueDto) {
    const slug = this.generateSlug(dto.name);

    const venue = this.venueRepo.create({
      ...dto,
      ownerId,
      slug,
    });

    const savedVenue = await this.venueRepo.save(venue);

    // Add owner as venue member
    await this.venueMemberRepo.save({
      userId: ownerId,
      venueId: savedVenue.id,
      role: 'owner',
      position: 'Egasi',
    });

    return savedVenue;
  }

  async findAll(pagination: PaginationDto) {
    const { page, limit, skip, search } = pagination;

    const qb = this.venueRepo.createQueryBuilder('venue');

    if (search) {
      qb.where('venue.name ILIKE :search OR venue.address ILIKE :search', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('venue.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string) {
    const venue = await this.venueRepo.findOne({
      where: { id },
      relations: ['halls', 'members', 'members.user'],
    });

    if (!venue) {
      throw new NotFoundException('To\'yxona topilmadi');
    }

    return venue;
  }

  async update(id: string, userId: string, dto: UpdateVenueDto) {
    const venue = await this.findOne(id);
    await this.checkAccess(userId, id);

    if (dto.name && dto.name !== venue.name) {
      (dto as any).slug = this.generateSlug(dto.name);
    }

    Object.assign(venue, dto);
    return this.venueRepo.save(venue);
  }

  async remove(id: string, userId: string) {
    await this.checkAccess(userId, id);
    await this.venueRepo.softDelete(id);
    return { message: 'To\'yxona o\'chirildi' };
  }

  private async checkAccess(userId: string, venueId: string) {
    const member = await this.venueMemberRepo.findOne({
      where: { userId, venueId, isActive: true },
    });

    if (!member || !['owner', 'manager'].includes(member.role)) {
      throw new ForbiddenException('Sizda bu to\'yxona uchun huquq yo\'q');
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now().toString(36);
  }

  // ═══ Venue Members ═══

  async getMembers(venueId: string) {
    return this.venueMemberRepo.find({
      where: { venueId, isActive: true },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  async addMember(venueId: string, userId: string, dto: AddVenueMemberDto) {
    await this.checkAccess(userId, venueId);

    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) {
      throw new NotFoundException('Bu telefon raqam bilan foydalanuvchi topilmadi. Avval ro\'yxatdan o\'tishi kerak.');
    }

    const existing = await this.venueMemberRepo.findOne({
      where: { userId: user.id, venueId },
    });
    if (existing) {
      if (existing.isActive) {
        throw new BadRequestException('Bu foydalanuvchi allaqachon to\'yxonaga qo\'shilgan');
      }
      existing.isActive = true;
      existing.role = dto.role;
      existing.position = dto.position ?? existing.position;
      return this.venueMemberRepo.save(existing);
    }

    const member = this.venueMemberRepo.create({
      userId: user.id,
      venueId,
      role: dto.role,
      position: dto.position,
    });

    return this.venueMemberRepo.save(member);
  }

  async updateMember(venueId: string, memberId: string, userId: string, dto: UpdateVenueMemberDto) {
    await this.checkAccess(userId, venueId);

    const member = await this.venueMemberRepo.findOne({
      where: { id: memberId, venueId },
    });
    if (!member) throw new NotFoundException('A\'zo topilmadi');

    if (member.role === 'owner') {
      throw new BadRequestException('Eganing rolini o\'zgartirib bo\'lmaydi');
    }

    Object.assign(member, dto);
    return this.venueMemberRepo.save(member);
  }

  async removeMember(venueId: string, memberId: string, userId: string) {
    await this.checkAccess(userId, venueId);

    const member = await this.venueMemberRepo.findOne({
      where: { id: memberId, venueId },
    });
    if (!member) throw new NotFoundException('A\'zo topilmadi');

    if (member.role === 'owner') {
      throw new BadRequestException('Egani o\'chirib bo\'lmaydi');
    }

    member.isActive = false;
    return this.venueMemberRepo.save(member);
  }
}
