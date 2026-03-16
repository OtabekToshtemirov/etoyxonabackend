import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: '+998901234567', description: 'OTP yuboriladigan telefon raqam' })
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam formati: +998XXXXXXXXX',
  })
  phone: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+998901234567' })
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam formati: +998XXXXXXXXX',
  })
  phone: string;

  @ApiProperty({ example: '123456', description: '6 xonali tasdiqlash kodi' })
  @IsNotEmpty({ message: 'OTP kodi kiritilishi shart' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP kodi 6 xonali raqam bo\'lishi kerak' })
  code: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '+998901234567' })
  @IsNotEmpty({ message: 'Telefon raqam kiritilishi shart' })
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: 'Telefon raqam formati: +998XXXXXXXXX',
  })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'OTP kodi kiritilishi shart' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP kodi 6 xonali raqam bo\'lishi kerak' })
  code: string;

  @ApiProperty({ description: 'Yangi parol' })
  @IsNotEmpty({ message: 'Yangi parol kiritilishi shart' })
  @IsString()
  newPassword: string;
}
