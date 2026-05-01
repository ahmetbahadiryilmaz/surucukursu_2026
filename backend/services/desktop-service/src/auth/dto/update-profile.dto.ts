import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: '5XX-XXX-XX-XX', description: 'Turkish mobile number' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(5\d{2}-\d{3}-\d{2}-\d{2})$/, { message: 'phone must be in format 5XX-XXX-XX-XX' })
  phone: string;
}
