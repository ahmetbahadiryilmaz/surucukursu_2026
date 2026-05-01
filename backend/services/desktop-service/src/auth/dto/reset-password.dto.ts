import { IsEmail, IsString, IsNotEmpty, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'ornek@mail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit verification code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  code: string;

  @ApiProperty({ example: 'YeniSifre123', description: 'New password (min 6 chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'newPassword must be at least 6 characters' })
  newPassword: string;
}
