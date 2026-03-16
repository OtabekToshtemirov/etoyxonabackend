import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { Venue } from '../venues/entities/venue.entity';
import { VenueMember } from '../users/entities/venue-member.entity';
import { AdminCreateVenueDto } from './dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Venue)
    private readonly venueRepo: Repository<Venue>,
    @InjectRepository(VenueMember)
    private readonly venueMemberRepo: Repository<VenueMember>,
  ) {}

  /**
   * Super Admin: Create venue + owner user in one operation
   */
  async createVenueWithOwner(dto: AdminCreateVenueDto) {
    // 1. Check if owner phone already exists
    let owner = await this.userRepo.findOne({
      where: { phone: dto.ownerPhone },
    });

    if (owner) {
      // User exists — use existing, just warn
      // If the user is not active, throw error
      if (owner.status !== 'active') {
        throw new ConflictException(
          'Bu telefon raqamdagi foydalanuvchi bloklangan',
        );
      }
    } else {
      // 2. Create new owner user
      const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);
      owner = this.userRepo.create({
        phone: dto.ownerPhone,
        passwordHash,
        fullName: dto.ownerFullName,
        role: 'owner',
        status: 'active',
      });
      owner = await this.userRepo.save(owner);
    }

    // 3. Create venue
    const slug = this.generateSlug(dto.name);
    const venue = this.venueRepo.create({
      name: dto.name,
      description: dto.description,
      region: dto.region,
      district: dto.district,
      address: dto.address,
      landmark: dto.landmark,
      phonePrimary: dto.phonePrimary,
      phoneSecondary: dto.phoneSecondary,
      defaultCurrency: dto.defaultCurrency || 'UZS',
      ownerId: owner.id,
      slug,
    });

    const savedVenue = await this.venueRepo.save(venue);

    // 4. Add owner as venue member
    await this.venueMemberRepo.save({
      userId: owner.id,
      venueId: savedVenue.id,
      role: 'owner',
      position: 'Egasi',
    });

    return {
      venue: savedVenue,
      owner: {
        id: owner.id,
        fullName: owner.fullName,
        phone: owner.phone,
      },
    };
  }

  /**
   * Get dashboard stats for admin
   */
  async getDashboardStats() {
    const totalVenues = await this.venueRepo.count();
    const activeVenues = await this.venueRepo.count({
      where: { status: 'active' },
    });
    const totalUsers = await this.userRepo.count();

    return {
      totalVenues,
      activeVenues,
      pendingVenues: totalVenues - activeVenues,
      totalUsers,
    };
  }

  /**
   * Get all venues with owner info (for admin list)
   */
  async findAllVenues(query: { page?: number; limit?: number; search?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.venueRepo
      .createQueryBuilder('venue')
      .leftJoinAndSelect('venue.owner', 'owner')
      .select([
        'venue',
        'owner.id',
        'owner.fullName',
        'owner.phone',
      ]);

    if (query.search) {
      qb.where(
        'venue.name ILIKE :search OR venue.address ILIKE :search OR venue.region ILIKE :search',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('venue.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Get all users with filtering (for admin list)
   */
  async findAllUsers(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.phone',
        'user.fullName',
        'user.email',
        'user.role',
        'user.status',
        'user.lastLoginAt',
        'user.createdAt',
      ]);

    if (query.search) {
      qb.where(
        'user.fullName ILIKE :search OR user.phone ILIKE :search',
        { search: `%${query.search}%` },
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    qb.orderBy('user.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Toggle venue verification
   */
  async toggleVerification(venueId: string) {
    const venue = await this.venueRepo.findOne({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException('To\'yxona topilmadi');
    }

    venue.isVerified = !venue.isVerified;
    return this.venueRepo.save(venue);
  }

  /**
   * Get venue details by ID (admin)
   */
  async findVenueById(venueId: string) {
    const venue = await this.venueRepo.findOne({
      where: { id: venueId },
      relations: ['owner', 'members', 'members.user', 'halls'],
    });
    if (!venue) {
      throw new NotFoundException('To\'yxona topilmadi');
    }
    return venue;
  }

  /**
   * Block user
   */
  async blockUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    if (user.role === 'super_admin') {
      throw new ConflictException('Super adminni bloklash mumkin emas');
    }
    user.status = 'blocked';
    user.refreshToken = null;
    return this.userRepo.save(user);
  }

  /**
   * Unblock user
   */
  async unblockUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    user.status = 'active';
    return this.userRepo.save(user);
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() +
      '-' +
      Date.now().toString(36)
    );
  }
}
