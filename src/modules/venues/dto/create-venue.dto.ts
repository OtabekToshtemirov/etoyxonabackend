import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches,
  IsNumber,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../common/enums';

export class CreateVenueDto {
  @ApiProperty({ example: 'Navruz To\'yxonasi' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Eng zamonaviy to\'yxona' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Toshkent shahri' })
  @IsNotEmpty()
  @IsString()
  region: string;

  @ApiProperty({ example: 'Chilonzor tumani' })
  @IsNotEmpty()
  @IsString()
  district: string;

  @ApiProperty({ example: 'Chilonzor 9, 15-uy' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 'Metro Chilonzor yonida' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({ example: '+998901234567' })
  @IsNotEmpty()
  @Matches(/^\+998\d{9}$/)
  phonePrimary: string;

  @ApiPropertyOptional({ example: '+998901234568' })
  @IsOptional()
  @Matches(/^\+998\d{9}$/)
  phoneSecondary?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.UZS })
  @IsOptional()
  @IsEnum(Currency)
  defaultCurrency?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  autoExchangeRate?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  taxPercentage?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  discountPercentage?: number;
}
