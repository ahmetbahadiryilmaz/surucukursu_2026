import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class UpdateAdminDto {
  @ApiProperty({
    description: 'Admin name',
    example: 'John Doe',
    required: false
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Admin email',
    example: 'admin@example.com',
    required: false
  })
  @IsString()
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Admin password',
    example: 'password123',
    required: false
  })
  @IsString()
  @IsOptional()
  password?: string;
}