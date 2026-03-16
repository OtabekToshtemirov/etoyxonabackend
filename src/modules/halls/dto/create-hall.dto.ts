import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../common/enums';

export class CreateHallDto {
  @ApiProperty({ example: 'Katta zal' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 50 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  minCapacity: number;

  @ApiProperty({ example: 500 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  maxCapacity: number;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsNumber()
  pricePerPerson?: number;

  @ApiPropertyOptional({ enum: Currency, default: Currency.UZS })
  @IsOptional()
  @IsEnum(Currency)
  priceCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  minimumAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  areaSqm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  floor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasStage?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasParking?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  parkingCapacity?: number;

  @ApiPropertyOptional({
    example: [
      { id: 'morning', name: 'Ertalabki', start: '08:00', end: '14:00' },
      { id: 'evening', name: 'Kechki', start: '19:00', end: '02:00' },
    ],
  })
  @IsOptional()
  @IsArray()
  timeSlots?: Array<{ id: string; name: string; start: string; end: string }>;
}
