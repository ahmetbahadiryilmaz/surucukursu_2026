import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class UpdateOwnerDto {
    @ApiProperty({
        description: 'Name of the driving school owner',
        example: 'John Doe'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    name?: string;

    @ApiProperty({
        description: 'Email of the driving school owner',
        example: 'john.doe@example.com'
    })
    @IsEmail()
    @IsNotEmpty()
    @IsOptional()
    email?: string;

    @ApiProperty({
        description: 'Password for the driving school owner',
        example: 'securePassword123'
    })
    @IsString()
    @IsOptional()
    password?: string;

    @ApiProperty({
        description: 'Phone number of the driving school owner',
        example: '+90 555 123 4567'
    })
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    phone?: string;
}