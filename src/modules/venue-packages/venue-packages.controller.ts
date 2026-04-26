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
import { VenuePackagesService } from './venue-packages.service';
import { CreateVenuePackageDto, UpdateVenuePackageDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('venue-packages')
@Controller('venues/:venueId/packages')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VenuePackagesController {
  constructor(private readonly venuePackagesService: VenuePackagesService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi paket yaratish' })
  async create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() data: CreateVenuePackageDto,
  ) {
    return this.venuePackagesService.create(venueId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Barcha paketlar ro\'yxati' })
  async findAll(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return this.venuePackagesService.findAll(venueId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Paket tafsilotlari' })
  async findOne(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.venuePackagesService.findOne(venueId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Paketni yangilash' })
  async update(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateVenuePackageDto,
  ) {
    return this.venuePackagesService.update(venueId, id, data);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Paketni o\'chirish' })
  async remove(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.venuePackagesService.remove(venueId, id);
  }
}
