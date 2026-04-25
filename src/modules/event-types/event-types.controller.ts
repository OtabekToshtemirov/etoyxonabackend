import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { EventTypesService } from './event-types.service';
import { CreateVenueEventTypeDto, UpdateVenueEventTypeDto } from './dto';

@ApiTags('Event Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('venues/:venueId/event-types')
export class EventTypesController {
  constructor(private readonly service: EventTypesService) {}

  @Get()
  findAll(@Param('venueId') venueId: string) {
    return this.service.findAll(venueId);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  create(
    @Param('venueId') venueId: string,
    @Body() dto: CreateVenueEventTypeDto,
  ) {
    return this.service.create(venueId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @Param('venueId') venueId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVenueEventTypeDto,
  ) {
    return this.service.update(venueId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  remove(
    @Param('venueId') venueId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(venueId, id);
  }
}
