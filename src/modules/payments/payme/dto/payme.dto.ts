import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Payme orqali to'lov boshlash uchun DTO
 * Frontend bu endpoint'ga so'rov yuboradi -> backend invoice yaratadi -> Payme URL qaytaradi
 */
export class PaymeCreateInvoiceDto {
  @ApiProperty({ description: 'Buyurtma ID' })
  @IsNotEmpty()
  @IsUUID()
  bookingId: string;

  @ApiProperty({ example: 5000000, description: 'To\'lov summasi (tiyin/so\'mda)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({ description: 'Qaytish URL (to\'lov tugagandan keyin)' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
