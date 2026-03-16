import { IsNotEmpty, IsString, IsUUID, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddVenueMemberDto {
  @ApiProperty({ description: 'Foydalanuvchi telefon raqami' })
  @IsNotEmpty({ message: 'Telefon raqamni kiriting' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Rol', enum: ['manager', 'staff'] })
  @IsNotEmpty({ message: 'Rolni tanlang' })
  @IsIn(['manager', 'staff'], { message: 'Rol faqat manager yoki staff bo\'lishi mumkin' })
  role: string;

  @ApiPropertyOptional({ description: 'Lavozim nomi' })
  @IsOptional()
  @IsString()
  position?: string;
}

export class UpdateVenueMemberDto {
  @ApiPropertyOptional({ description: 'Rol', enum: ['manager', 'staff'] })
  @IsOptional()
  @IsIn(['manager', 'staff'], { message: 'Rol faqat manager yoki staff bo\'lishi mumkin' })
  role?: string;

  @ApiPropertyOptional({ description: 'Lavozim nomi' })
  @IsOptional()
  @IsString()
  position?: string;
}
