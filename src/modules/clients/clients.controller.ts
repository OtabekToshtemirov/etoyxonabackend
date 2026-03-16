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
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto';
import { PaginationDto } from '../../common/dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('clients')
@Controller('venues/:venueId/clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Yangi mijoz qo\'shish' })
  async create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() data: CreateClientDto,
  ) {
    return this.clientsService.create(venueId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Mijozlar ro\'yxati' })
  async findAll(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.clientsService.findAll(venueId, pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Mijoz profili' })
  async findOne(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.findOne(venueId, id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Mijoz ma\'lumotlarini tahrirlash' })
  async update(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateClientDto,
  ) {
    return this.clientsService.update(venueId, id, data);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Mijozni o\'chirish' })
  async remove(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.clientsService.remove(venueId, id);
  }
}
