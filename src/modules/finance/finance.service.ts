import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Expense } from './entities/expense.entity';
import { ExpenseCategory } from './entities/expense-category.entity';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { Payment } from '../payments/entities/payment.entity';
import * as ExcelJS from 'exceljs';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
    @InjectRepository(ExpenseCategory)
    private readonly expenseCategoryRepo: Repository<ExpenseCategory>,
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepo: Repository<ExchangeRate>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  // ─── Expenses ──────────────────────────────────────
  async createExpense(venueId: string, userId: string, data: Partial<Expense>) {
    const expense = this.expenseRepo.create({
      ...data,
      title: data.title || data.description || '',
      venueId,
      createdBy: userId,
    });
    return this.expenseRepo.save(expense);
  }

  async findExpenses(venueId: string, filters?: any) {
    const qb = this.expenseRepo
      .createQueryBuilder('expense')
      .leftJoinAndSelect('expense.category', 'category')
      .leftJoinAndSelect('expense.creator', 'creator')
      .where('expense.venueId = :venueId', { venueId });

    if (filters?.startDate && filters?.endDate) {
      qb.andWhere('expense.expenseDate BETWEEN :start AND :end', {
        start: filters.startDate,
        end: filters.endDate,
      });
    }

    if (filters?.categoryId) {
      qb.andWhere('expense.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    qb.orderBy('expense.expenseDate', 'DESC');
    return qb.getMany();
  }

  // ─── Expense Categories ────────────────────────────
  async findExpenseCategories(venueId: string) {
    return this.expenseCategoryRepo.find({
      where: [{ venueId }, { venueId: IsNull() as any }],
      order: { sortOrder: 'ASC' },
    });
  }

  // ─── Expense CRUD ─────────────────────────────────
  async findOneExpense(venueId: string, id: string) {
    const expense = await this.expenseRepo.findOne({
      where: { id, venueId },
      relations: ['category', 'creator'],
    });
    if (!expense) throw new NotFoundException('Xarajat topilmadi');
    return expense;
  }

  async updateExpense(venueId: string, id: string, data: Partial<Expense>) {
    const expense = await this.findOneExpense(venueId, id);
    Object.assign(expense, data);
    return this.expenseRepo.save(expense);
  }

  async removeExpense(venueId: string, id: string) {
    await this.findOneExpense(venueId, id);
    await this.expenseRepo.softDelete(id);
    return { message: 'Xarajat o\'chirildi' };
  }

  // ─── Financial Summary ─────────────────────────────
  async getFinanceSummary(venueId: string, startDate: string, endDate: string) {
    // Total income from payments
    const incomeResult = await this.paymentRepo
      .createQueryBuilder('payment')
      .select('payment.currency', 'currency')
      .addSelect('SUM(payment.amount)', 'total')
      .where('payment.venueId = :venueId', { venueId })
      .andWhere('payment.status = :status', { status: 'completed' })
      .andWhere('payment.paidAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('payment.currency')
      .getRawMany();

    // Total expenses
    const expenseResult = await this.expenseRepo
      .createQueryBuilder('expense')
      .select('expense.currency', 'currency')
      .addSelect('SUM(expense.amount)', 'total')
      .where('expense.venueId = :venueId', { venueId })
      .andWhere('expense.status = :status', { status: 'approved' })
      .andWhere('expense.expenseDate BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      })
      .groupBy('expense.currency')
      .getRawMany();

    return {
      income: incomeResult,
      expenses: expenseResult,
      period: { startDate, endDate },
    };
  }

  // ─── Exchange Rates ────────────────────────────────
  async getLatestRate(fromCurrency: string, toCurrency: string) {
    return this.exchangeRateRepo.findOne({
      where: { fromCurrency, toCurrency },
      order: { date: 'DESC' },
    });
  }

  async saveRate(data: Partial<ExchangeRate>) {
    const rate = this.exchangeRateRepo.create(data);
    return this.exchangeRateRepo.save(rate);
  }

  // ─── Excel Export ──────────────────────────────────
  async exportToExcel(venueId: string, startDate: string, endDate: string): Promise<ExcelJS.Buffer> {
    const [expenses, payments, summary] = await Promise.all([
      this.findExpenses(venueId, { startDate, endDate }),
      this.paymentRepo
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.booking', 'booking')
        .leftJoinAndSelect('payment.client', 'client')
        .where('payment.venueId = :venueId', { venueId })
        .andWhere('payment.status = :status', { status: 'completed' })
        .andWhere('payment.paidAt BETWEEN :start AND :end', { start: startDate, end: endDate })
        .orderBy('payment.paidAt', 'DESC')
        .getMany(),
      this.getFinanceSummary(venueId, startDate, endDate),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'iToyxona';
    workbook.created = new Date();

    // Sheet 1: Daromadlar (To'lovlar)
    const incomeSheet = workbook.addWorksheet('Daromadlar');
    incomeSheet.columns = [
      { header: '№', key: 'num', width: 5 },
      { header: 'Sana', key: 'date', width: 12 },
      { header: 'To\'lov raqami', key: 'number', width: 16 },
      { header: 'Mijoz', key: 'client', width: 25 },
      { header: 'Buyurtma', key: 'booking', width: 16 },
      { header: 'Summa', key: 'amount', width: 18 },
      { header: 'Valyuta', key: 'currency', width: 8 },
      { header: 'Usul', key: 'method', width: 12 },
      { header: 'Izoh', key: 'notes', width: 30 },
    ];

    // Style header
    incomeSheet.getRow(1).font = { bold: true };
    incomeSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    incomeSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    payments.forEach((p, i) => {
      incomeSheet.addRow({
        num: i + 1,
        date: p.paidAt ? new Date(p.paidAt).toLocaleDateString('uz-UZ') : '',
        number: p.paymentNumber,
        client: p.client?.fullName || '',
        booking: p.booking?.bookingNumber || '',
        amount: Number(p.amount),
        currency: p.currency,
        method: p.paymentMethod,
        notes: p.notes || '',
      });
    });

    // Sheet 2: Xarajatlar
    const expenseSheet = workbook.addWorksheet('Xarajatlar');
    expenseSheet.columns = [
      { header: '№', key: 'num', width: 5 },
      { header: 'Sana', key: 'date', width: 12 },
      { header: 'Sarlavha', key: 'title', width: 25 },
      { header: 'Kategoriya', key: 'category', width: 20 },
      { header: 'Summa', key: 'amount', width: 18 },
      { header: 'Valyuta', key: 'currency', width: 8 },
      { header: 'Izoh', key: 'description', width: 30 },
    ];

    expenseSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    expenseSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };

    expenses.forEach((e, i) => {
      expenseSheet.addRow({
        num: i + 1,
        date: e.expenseDate,
        title: e.title,
        category: e.category?.name || '',
        amount: Number(e.amount),
        currency: e.currency,
        description: e.description || '',
      });
    });

    // Sheet 3: Umumiy hisobot
    const summarySheet = workbook.addWorksheet('Umumiy hisobot');
    summarySheet.columns = [
      { header: 'Ko\'rsatkich', key: 'label', width: 25 },
      { header: 'Qiymat', key: 'value', width: 20 },
      { header: 'Valyuta', key: 'currency', width: 10 },
    ];
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };

    summarySheet.addRow({ label: `Davr: ${startDate} — ${endDate}`, value: '', currency: '' });
    summarySheet.addRow({ label: '', value: '', currency: '' });

    summary.income.forEach((inc: any) => {
      summarySheet.addRow({ label: 'Jami daromad', value: Number(inc.total), currency: inc.currency });
    });
    summary.expenses.forEach((exp: any) => {
      summarySheet.addRow({ label: 'Jami xarajat', value: Number(exp.total), currency: exp.currency });
    });

    return workbook.xlsx.writeBuffer();
  }
}
