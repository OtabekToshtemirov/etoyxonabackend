import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private eskizToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private get isMockMode(): boolean {
    return this.configService.get<string>('SMS_MODE', 'mock') === 'mock';
  }

  private async getEskizToken(): Promise<string> {
    // Return cached token if still valid (tokens last 30 days, refresh every 29)
    if (this.eskizToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.eskizToken;
    }

    try {
      const email = this.configService.get<string>('ESKIZ_EMAIL');
      const password = this.configService.get<string>('ESKIZ_PASSWORD');

      if (!email || !password) {
        this.logger.warn('Eskiz SMS credentials not found in environment');
        return '';
      }

      const response = await firstValueFrom(
        this.httpService.post('https://notify.eskiz.uz/api/auth/login', {
          email,
          password,
        }),
      );

      this.eskizToken = response.data.data.token;
      this.tokenExpiresAt = new Date(Date.now() + 29 * 24 * 60 * 60 * 1000);
      return this.eskizToken || '';
    } catch (error) {
      this.logger.error('Failed to get Eskiz token:', error.message);
      return '';
    }
  }

  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

      // Mock mode — faqat log qiladi
      if (this.isMockMode) {
        this.logger.log(`[MOCK SMS] ${cleanPhone}: ${message}`);
        return true;
      }

      // Production mode — Eskiz.uz orqali yuboradi
      const token = await this.getEskizToken();
      if (!token) {
        this.logger.error('Eskiz token olinmadi, SMS yuborilmadi');
        return false;
      }

      const response = await firstValueFrom(
        this.httpService.post(
          'https://notify.eskiz.uz/api/message/sms/send',
          {
            mobile_phone: cleanPhone,
            message,
            from: this.configService.get<string>('ESKIZ_SENDER', '4546'),
            callback_url: '',
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        ),
      );

      this.logger.log(`SMS yuborildi: ${cleanPhone}, status: ${response.data?.status}`);
      return true;
    } catch (error) {
      this.logger.error(`SMS yuborishda xatolik (${phoneNumber}):`, error.message);
      return false;
    }
  }
}
