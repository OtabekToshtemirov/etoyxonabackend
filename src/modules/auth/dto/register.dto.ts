import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: '+998901234567' })
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam formati: +998XXXXXXXXX',
  })
  phone: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 ta belgi bo\'lishi kerak' })
  password: string;

  @ApiProperty({ example: 'Alisher Valiev' })
  @IsNotEmpty({ message: 'To\'liq ism kiritilishi shart' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: 'alisher@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}
