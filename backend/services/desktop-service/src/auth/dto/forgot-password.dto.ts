import { IsEmail, IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ornek@mail.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '5XX-XXX-XX-XX', description: 'Turkish mobile number without leading zero, or 000-000-00-00 to bypass check' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(000-000-00-00|5\d{2}-\d{3}-\d{2}-\d{2})$/, { message: 'phone must be in format 5XX-XXX-XX-XX' })
  phone: string;
}
