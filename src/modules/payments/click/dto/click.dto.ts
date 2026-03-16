import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Click orqali to'lov boshlash uchun DTO
 */
export class ClickCreateInvoiceDto {
  @ApiProperty({ description: 'Buyurtma ID' })
  @IsNotEmpty()
  @IsUUID()
  bookingId: string;

  @ApiProperty({ example: 5000000, description: 'To\'lov summasi (so\'mda)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({ description: 'Qaytish URL' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
