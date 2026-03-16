import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ClickService } from './click.service';
import { ClickCreateInvoiceDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { CurrentUser, Roles } from '../../../common/decorators';
import { Role } from '../../../common/enums';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('click')
@Controller()
export class ClickController {
  constructor(private readonly clickService: ClickService) {}

  /**
   * Click checkout URL olish
   */
  @Post('venues/:venueId/payments/click/invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Click to\'lov havolasini olish' })
  async createInvoice(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ClickCreateInvoiceDto,
  ) {
    return this.clickService.createInvoice(
      venueId,
      userId,
      dto.bookingId,
      dto.amount,
      dto.returnUrl,
    );
  }

  /**
   * Click integratsiya holati (shu venue uchun)
   */
  @Get('venues/:venueId/payments/click/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Click integratsiya holati (shu venue uchun)' })
  async getStatus(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return {
      configured: await this.clickService.isConfiguredForVenue(venueId),
      provider: 'click',
    };
  }

  /**
   * Click Prepare webhook
   * Click bu URL'ga to'lov boshlashdan oldin so'rov yuboradi
   */
  @Post('click/prepare')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handlePrepare(@Body() body: any) {
    return this.clickService.handlePrepare(body);
  }

  /**
   * Click Complete webhook
   * Click bu URL'ga to'lov yakunlanganda so'rov yuboradi
   */
  @Post('click/complete')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleComplete(@Body() body: any) {
    return this.clickService.handleComplete(body);
  }
}
