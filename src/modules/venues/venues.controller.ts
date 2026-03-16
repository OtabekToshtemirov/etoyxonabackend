import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { AddVenueMemberDto, UpdateVenueMemberDto } from './dto/venue-member.dto';
import { PaginationDto } from '../../common/dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('venues')
@Controller('venues')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi to\'yxona yaratish' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVenueDto,
  ) {
    return this.venuesService.create(userId, dto);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Barcha to\'yxonalar ro\'yxati' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.venuesService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'To\'yxona ma\'lumotlari' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.venuesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'To\'yxonani tahrirlash' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateVenueDto,
  ) {
    return this.venuesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'To\'yxonani o\'chirish' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.venuesService.remove(id, userId);
  }

  // ═══ Venue Members ═══

  @Get(':id/members')
  @ApiOperation({ summary: 'To\'yxona a\'zolari ro\'yxati' })
  async getMembers(@Param('id', ParseUUIDPipe) id: string) {
    return this.venuesService.getMembers(id);
  }

  @Post(':id/members')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Yangi a\'zo qo\'shish' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AddVenueMemberDto,
  ) {
    return this.venuesService.addMember(id, userId, dto);
  }

  @Patch(':id/members/:memberId')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'A\'zo ma\'lumotlarini tahrirlash' })
  async updateMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateVenueMemberDto,
  ) {
    return this.venuesService.updateMember(id, memberId, userId, dto);
  }

  @Delete(':id/members/:memberId')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'A\'zoni olib tashlash' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.venuesService.removeMember(id, memberId, userId);
  }
}
