import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../../common/enums';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('venues/:venueId/analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  getOverview(@Param('venueId') venueId: string) {
    return this.service.getOverview(venueId);
  }
}
