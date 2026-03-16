import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Venue } from '../venues/entities/venue.entity';
import { VenueMember } from '../users/entities/venue-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Venue, VenueMember])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
