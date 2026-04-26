import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../common/enums';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Buyurtma ID' })
  @IsNotEmpty()
  @IsUUID()
  bookingId: string;

  @ApiProperty({ example: 5000000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.UZS })
  @IsOptional()
  @IsEnum(Currency)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  exchangeRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amountInBase?: number;

  @ApiProperty({ enum: ['cash', 'card', 'bank_transfer', 'payme', 'click', 'uzum'] })
  @IsNotEmpty()
  @IsEnum(['cash', 'card', 'bank_transfer', 'payme', 'click', 'uzum'])
  paymentMethod: string;

  @ApiPropertyOptional({ enum: ['payment', 'deposit', 'refund'], default: 'payment' })
  @IsOptional()
  @IsEnum(['payment', 'deposit', 'refund'])
  paymentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
