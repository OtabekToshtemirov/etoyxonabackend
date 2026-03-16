import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { PaymeService } from './payme.service';
import { PaymeCreateInvoiceDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { CurrentUser, Roles } from '../../../common/decorators';
import { Role } from '../../../common/enums';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('payme')
@Controller()
export class PaymeController {
  constructor(private readonly paymeService: PaymeService) {}

  /**
   * Payme checkout URL olish
   * Frontend shu endpoint'ga so'rov yuboradi, keyin qaytgan URL'ga redirect qiladi
   */
  @Post('venues/:venueId/payments/payme/invoice')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Payme to\'lov havolasini olish' })
  async createInvoice(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: PaymeCreateInvoiceDto,
  ) {
    return this.paymeService.createInvoice(
      venueId,
      userId,
      dto.bookingId,
      dto.amount,
      dto.returnUrl,
    );
  }

  /**
   * Payme integratsiya holati (shu venue uchun)
   */
  @Get('venues/:venueId/payments/payme/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Payme integratsiya holati (shu venue uchun)' })
  async getStatus(@Param('venueId', ParseUUIDPipe) venueId: string) {
    return {
      configured: await this.paymeService.isConfiguredForVenue(venueId),
      provider: 'payme',
    };
  }

  /**
   * Payme Webhook endpoint
   * Payme serveri bu URL'ga JSON-RPC formatda so'rov yuboradi
   * Bu endpoint public (auth Payme tomonidan Basic Auth bilan qilinadi)
   */
  @Post('payme/webhook')
  @SkipThrottle()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Headers('authorization') authHeader: string,
    @Body() body: any,
  ) {
    return this.paymeService.handleWebhook(authHeader, body);
  }
}
