import { IsNotEmpty, IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateVenueEventTypeDto {
  @ApiProperty({ example: "To'y" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '#3B82F6' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateVenueEventTypeDto extends PartialType(CreateVenueEventTypeDto) {}
