import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HallsService } from './halls.service';
import { CreateHallDto } from './dto/create-hall.dto';
import { UpdateHallDto } from './dto/update-hall.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('halls')
@Controller('venues/:venueId/halls')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HallsController {
  constructor(private readonly hallsService: HallsService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi zal yaratish' })
  async create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() dto: CreateHallDto,
  ) {
    return this.hallsService.create(venueId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Venue zallarini ko\'rish' })
  async findAll(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.hallsService.findAllByVenue(venueId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Zal ma\'lumotlari' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.hallsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Zalni tahrirlash' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHallDto,
  ) {
    return this.hallsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Zalni o\'chirish' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.hallsService.remove(id);
  }
}
