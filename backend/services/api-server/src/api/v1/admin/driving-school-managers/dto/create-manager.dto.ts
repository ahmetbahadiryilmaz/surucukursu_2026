import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class CreateManagerDto {
    @ApiProperty({
        description: 'Name of the driving school manager',
        example: 'John Doe'
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        description: 'Email of the driving school manager',
        example: 'john.doe@example.com'
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({
        description: 'Password for the driving school manager',
        example: 'securePassword123'
    })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty({
        description: 'Phone number of the driving school manager',
        example: '+90 555 123 4567'
    })
    @IsString()
    @IsNotEmpty()
    phone: string;
}