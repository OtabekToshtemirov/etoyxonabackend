import {
  IsNotEmpty,
  IsString,
  IsOptional,
  Matches,
  MinLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../common/enums';

export class AdminCreateVenueDto {
  // Venue fields
  @ApiProperty({ example: 'Navruz To\'yxonasi' })
  @IsNotEmpty({ message: 'Nomi kiritilishi shart' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Eng zamonaviy to\'yxona' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Toshkent shahri' })
  @IsNotEmpty({ message: 'Viloyat kiritilishi shart' })
  @IsString()
  region: string;

  @ApiProperty({ example: 'Chilonzor tumani' })
  @IsNotEmpty({ message: 'Tuman kiritilishi shart' })
  @IsString()
  district: string;

  @ApiProperty({ example: 'Chilonzor 9, 15-uy' })
  @IsNotEmpty({ message: 'Manzil kiritilishi shart' })
  @IsString()
  address: string;

  @ApiPropertyOptional({ example: 'Metro Chilonzor yonida' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiProperty({ example: '+998901234567' })
  @IsNotEmpty({ message: 'Telefon kiritilishi shart' })
  @Matches(/^\+998\d{9}$/, { message: 'Telefon formati: +998XXXXXXXXX' })
  phonePrimary: string;

  @ApiPropertyOptional({ example: '+998901234568' })
  @IsOptional()
  @Matches(/^\+998\d{9}$/, { message: 'Telefon formati: +998XXXXXXXXX' })
  phoneSecondary?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.UZS })
  @IsOptional()
  @IsEnum(Currency)
  defaultCurrency?: string;

  // Owner fields
  @ApiProperty({ example: 'Alisher Valiyev' })
  @IsNotEmpty({ message: 'Egasi ismi kiritilishi shart' })
  @IsString()
  ownerFullName: string;

  @ApiProperty({ example: '+998901234567' })
  @IsNotEmpty({ message: 'Egasi telefoni kiritilishi shart' })
  @Matches(/^\+998\d{9}$/, { message: 'Telefon formati: +998XXXXXXXXX' })
  ownerPhone: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 ta belgi' })
  ownerPassword: string;
}
