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
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { FinanceService } from './finance.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('finance')
@Controller('venues/:venueId/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('expenses')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi xarajat qo\'shish' })
  async createExpense(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @CurrentUser('sub') userId: string,
    @Body() data: CreateExpenseDto,
  ) {
    return this.financeService.createExpense(venueId, userId, data);
  }

  @Get('expenses')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xarajatlar ro\'yxati' })
  async findExpenses(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.financeService.findExpenses(venueId, {
      startDate,
      endDate,
      categoryId,
    });
  }

  @Get('expenses/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xarajat tafsilotlari' })
  async findOneExpense(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.financeService.findOneExpense(venueId, id);
  }

  @Patch('expenses/:id')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Xarajatni tahrirlash' })
  async updateExpense(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: UpdateExpenseDto,
  ) {
    return this.financeService.updateExpense(venueId, id, data);
  }

  @Delete('expenses/:id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Xarajatni o\'chirish' })
  async removeExpense(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.financeService.removeExpense(venueId, id);
  }

  @Get('expense-categories')
  @ApiOperation({ summary: 'Xarajat kategoriyalari' })
  async findExpenseCategories(
    @Param('venueId', ParseUUIDPipe) venueId: string,
  ) {
    return this.financeService.findExpenseCategories(venueId);
  }

  @Get('summary')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Moliyaviy umumiy hisobot' })
  async getFinanceSummary(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getFinanceSummary(venueId, startDate, endDate);
  }

  @Get('exchange-rates/latest')
  @ApiOperation({ summary: 'So\'nggi valyuta kursi' })
  async getLatestRate(
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ) {
    return this.financeService.getLatestRate(fromCurrency, toCurrency);
  }

  @Get('export/excel')
  @Roles(Role.OWNER, Role.MANAGER)
  @ApiOperation({ summary: 'Moliyaviy hisobotni Excel formatda yuklab olish' })
  async exportExcel(
    @Param('venueId', ParseUUIDPipe) venueId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const buffer = await this.financeService.exportToExcel(venueId, startDate, endDate);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=hisobot-${startDate}-${endDate}.xlsx`);
    res.send(buffer);
  }
}
