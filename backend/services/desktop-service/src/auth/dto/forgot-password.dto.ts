import { IsEmail, IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ornek@mail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '5551234567', description: '10-digit Turkish mobile number (5XXXXXXXXX), or 0000000000 to bypass check' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(0000000000|5\d{9})$/, { message: 'Telefon 10 haneli ve 5 ile başlamalıdır (5XXXXXXXXX).' })
  phone: string;
}
