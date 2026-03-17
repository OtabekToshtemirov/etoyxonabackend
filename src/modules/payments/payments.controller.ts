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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto, UpdatePaymentSettingsDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('payments')
@Controller('venues/:venueId/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ═══ Payment Settings (Payme/Click kalitlari) ═══

  @Get('settings')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'To\'lov sozlamalarini ko\'rish (Payme/Click kalitlari)' })
  async getPaymentSettings(
    @Param('venueId', ParseUUIDPipe) venueId: string,
  ) {
    return this.paymentsService.getPaymentSettings(venueId);
  }

  @Patch('settings')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'To\'lov sozlamalarini yangilash (Payme/Click kalitlari)' })
  async updatePaymentSettings(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Body() dto: UpdatePaymentSettingsDto,
  ) {
    return this.paymentsService.updatePaymentSettings(venueId, dto);
  }

  // ═══ Payments CRUD ═══

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  @ApiOperation({ summary: 'Yangi to\'lov qabul qilish' })
  async create(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @CurrentUser('sub') userId: string,
    @Body() data: CreatePaymentDto,
  ) {
    return this.paymentsService.create(venueId, userId, data);
  }

  @Get()
  @ApiOperation({ summary: 'To\'lovlar ro\'yxati' })
  async findAll(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query('bookingId') bookingId?: string,
    @Query('status') status?: string,
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    return this.paymentsService.findAllByVenue(venueId, {
      bookingId,
      status,
      paymentMethod,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'To\'lov tafsilotlari' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'To\'lovni tahrirlash' })
  async update(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdatePaymentDto,
  ) {
    return this.paymentsService.update(venueId, id, data);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'To\'lovni o\'chirish' })
  async remove(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.paymentsService.remove(venueId, id);
  }
}
