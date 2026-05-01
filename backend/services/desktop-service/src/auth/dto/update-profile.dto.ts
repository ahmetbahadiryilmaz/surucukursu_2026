import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: '5551234567', description: '10-digit Turkish mobile number (5XXXXXXXXX)' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^5\d{9}$/, { message: 'Telefon 10 haneli ve 5 ile başlamalıdır (5XXXXXXXXX).' })
  phone: string;
}
