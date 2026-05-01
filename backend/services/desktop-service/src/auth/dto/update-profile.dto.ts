import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ example: '5551234567', description: 'Phone number (any format)' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
