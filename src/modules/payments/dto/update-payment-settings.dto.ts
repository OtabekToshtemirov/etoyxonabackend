import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * To'yxona egasi Settings sahifasida to'lov sozlamalarini kiritadi.
 * Faqat o'zi bilgan kalitlarni yuboradi — qolganlar null bo'lib qoladi.
 */
export class UpdatePaymentSettingsDto {
  // ─── Payme ──────────────────────────────────
  @ApiPropertyOptional({ description: 'Payme yoqilgan/yoqilmagan' })
  @IsOptional()
  @IsBoolean()
  paymeEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Payme Merchant ID (Payme kabinetidan olasiz)' })
  @IsOptional()
  @IsString()
  paymeMerchantId?: string;

  @ApiPropertyOptional({ description: 'Payme Merchant Key (Payme kabinetidan olasiz)' })
  @IsOptional()
  @IsString()
  paymeMerchantKey?: string;

  @ApiPropertyOptional({ description: 'Test rejim (true = test, false = production)' })
  @IsOptional()
  @IsBoolean()
  paymeTestMode?: boolean;

  // ─── Click ──────────────────────────────────
  @ApiPropertyOptional({ description: 'Click yoqilgan/yoqilmagan' })
  @IsOptional()
  @IsBoolean()
  clickEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Click Merchant ID (Click kabinetidan olasiz)' })
  @IsOptional()
  @IsString()
  clickMerchantId?: string;

  @ApiPropertyOptional({ description: 'Click Service ID (Click kabinetidan olasiz)' })
  @IsOptional()
  @IsString()
  clickServiceId?: string;

  @ApiPropertyOptional({ description: 'Click Secret Key (Click kabinetidan olasiz)' })
  @IsOptional()
  @IsString()
  clickSecretKey?: string;
}
