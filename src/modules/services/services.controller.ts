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
import { ServicesService } from './services.service';
import { CreateServiceDto, UpdateServiceDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('services')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('venues/:venueId/services/categories')
  @ApiOperation({ summary: 'Xizmat kategoriyalari' })
  async getCategories() {
    return this.servicesService.findCategories();
  }

  @Post('venues/:venueId/services')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi xizmat qo\'shish' })
  async create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() data: CreateServiceDto,
  ) {
    return this.servicesService.create(venueId, data);
  }

  @Get('venues/:venueId/services')
  @ApiOperation({ summary: 'Venue xizmatlari' })
  async findAll(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.servicesService.findAllByVenue(venueId, categoryId);
  }

  @Get('venues/:venueId/services/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.findOne(id);
  }

  @Patch('venues/:venueId/services/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.servicesService.update(id, data);
  }

  @Delete('venues/:venueId/services/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.remove(id);
  }
}
