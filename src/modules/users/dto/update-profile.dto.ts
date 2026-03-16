import { IsOptional, IsString, IsEmail, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Alisher Valiev' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: 'alisher@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email formati noto\'g\'ri' })
  email?: string;

  @ApiPropertyOptional({ example: 'uz', enum: ['uz', 'ru', 'en'] })
  @IsOptional()
  @IsString()
  language?: string;
}
