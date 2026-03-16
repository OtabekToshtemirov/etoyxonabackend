import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminCreateVenueDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Admin dashboard statistikasi' })
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('venues')
  @ApiOperation({ summary: 'Barcha to\'yxonalar (admin)' })
  async findAllVenues(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.findAllVenues({ page, limit, search });
  }

  @Get('venues/:id')
  @ApiOperation({ summary: 'To\'yxona tafsilotlari (admin)' })
  async findVenueById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.findVenueById(id);
  }

  @Get('users')
  @ApiOperation({ summary: 'Barcha foydalanuvchilar (admin)' })
  async findAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.findAllUsers({ page, limit, search, role });
  }

  @Post('venues')
  @ApiOperation({ summary: 'To\'yxona + owner yaratish (admin)' })
  async createVenueWithOwner(@Body() dto: AdminCreateVenueDto) {
    return this.adminService.createVenueWithOwner(dto);
  }

  @Patch('venues/:id/verify')
  @ApiOperation({ summary: 'To\'yxona tasdiqlash/bekor qilish' })
  async toggleVerification(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.toggleVerification(id);
  }

  @Patch('users/:id/block')
  @ApiOperation({ summary: 'Foydalanuvchini bloklash' })
  async blockUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.blockUser(id);
  }

  @Patch('users/:id/unblock')
  @ApiOperation({ summary: 'Foydalanuvchini blokdan chiqarish' })
  async unblockUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.unblockUser(id);
  }
}
