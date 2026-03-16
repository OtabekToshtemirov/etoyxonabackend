import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Joriy parol' })
  @IsNotEmpty({ message: 'Joriy parol kiritilishi shart' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'Yangi parol (kamida 6 ta belgi)' })
  @IsNotEmpty({ message: 'Yangi parol kiritilishi shart' })
  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 ta belgi bo\'lishi kerak' })
  newPassword: string;
}
