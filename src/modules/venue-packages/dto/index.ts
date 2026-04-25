import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class VenuePackageItemDto {
  @ApiProperty({ enum: ['menu_item', 'service'] })
  @IsNotEmpty()
  @IsString()
  type: string; // 'menu_item' | 'service'

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  menuItemId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  venueServiceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateVenuePackageDto {
  @ApiProperty({ description: 'Paket nomi' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '1 kishi uchun umumiy narx' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  pricePerPerson: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  priceCurrency?: string;

  @ApiPropertyOptional({ description: 'Menyu narxi (1 kishi)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  menuPricePerPerson?: number;

  @ApiPropertyOptional({ enum: ['economy', 'standard', 'premium', 'vip'] })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  maxGuests?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ type: [VenuePackageItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenuePackageItemDto)
  items?: VenuePackageItemDto[];
}

export class UpdateVenuePackageDto extends PartialType(CreateVenuePackageDto) {}
