import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { VenueMember } from './entities/venue-member.entity';
import { UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(VenueMember)
    private readonly venueMemberRepo: Repository<VenueMember>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: [
        'id',
        'phone',
        'fullName',
        'email',
        'avatarUrl',
        'role',
        'language',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    // Get user's venues
    const venueMembers = await this.venueMemberRepo.find({
      where: { userId, isActive: true },
      relations: ['venue'],
    });

    return {
      ...user,
      venues: venueMembers.map((vm) => ({
        id: vm.venue.id,
        name: vm.venue.name,
        role: vm.role,
        position: vm.position,
      })),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updateData: Partial<User> = {};
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.language !== undefined) updateData.language = dto.language;

    await this.userRepo.update(userId, updateData);
    return this.getProfile(userId);
  }

  async findById(userId: string) {
    return this.userRepo.findOne({ where: { id: userId } });
  }
}
