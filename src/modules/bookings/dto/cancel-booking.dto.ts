import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CancelBookingDto {
  @ApiProperty({ description: 'Bekor qilish sababi' })
  @IsNotEmpty({ message: 'Bekor qilish sababini kiriting' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'To\'lovlarni qaytarishmi', default: false })
  @IsOptional()
  @IsBoolean()
  refund?: boolean;
}
