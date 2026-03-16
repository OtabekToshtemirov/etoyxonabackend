import { PartialType } from '@nestjs/swagger';
import { CreateBookingDto } from './create-booking.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @ApiPropertyOptional({ enum: ['pending', 'deposit_paid', 'confirmed', 'fully_paid', 'completed'] })
  @IsOptional()
  @IsString()
  status?: string;
}
