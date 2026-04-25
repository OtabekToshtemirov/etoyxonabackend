import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, EventType } from '../../../common/enums';

export class BookingMenuItemDto {
  @IsNotEmpty()
  @IsUUID()
  menuItemId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  pricePerPerson: number;
}

export class BookingServiceItemDto {
  @IsNotEmpty()
  @IsUUID()
  venueServiceId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateBookingDto {
  @ApiProperty({ description: 'Zal ID' })
  @IsNotEmpty()
  @IsUUID()
  hallId: string;

  @ApiPropertyOptional({ description: 'Mijoz ID' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Mijoz telefon raqami' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ description: 'Mijoz ismi' })
  @IsOptional()
  @IsString()
  clientFullName?: string;

  @ApiProperty({ description: 'Tadbir sanasi', example: '2026-04-15' })
  @IsNotEmpty()
  @IsDateString()
  eventDate: string;

  @ApiProperty({ enum: ['morning', 'afternoon', 'evening', 'full_day', 'custom'] })
  @IsNotEmpty()
  @IsString()
  timeSlot: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  endTime?: string;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @IsString()
  customStartTime?: string;

  @ApiPropertyOptional({ example: '14:00' })
  @IsOptional()
  @IsString()
  customEndTime?: string;

  @ApiProperty({ example: 200 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  guestCount: number;

  @ApiPropertyOptional({ enum: EventType, default: 'wedding' })
  @IsOptional()
  @IsString()
  eventType?: string;

  @ApiPropertyOptional({ description: 'Tayyor paket ID' })
  @IsOptional()
  @IsUUID()
  venuePackageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  menuPackageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  menuPricePerPerson?: number;

  @ApiPropertyOptional({ example: 5000000, description: 'Zal umumiy narxi (soatga yoki tadbirga)' })
  @IsOptional()
  @IsNumber()
  hallPrice?: number;

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
  servicesTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  discountReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ type: [BookingMenuItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingMenuItemDto)
  menuItems?: BookingMenuItemDto[];

  @ApiPropertyOptional({ type: [BookingServiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceItemDto)
  services?: BookingServiceItemDto[];
}
