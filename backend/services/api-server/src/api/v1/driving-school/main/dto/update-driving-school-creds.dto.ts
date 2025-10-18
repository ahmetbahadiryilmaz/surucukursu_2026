import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateDrivingSchoolCredsDto {
    @ApiProperty({
        description: 'Mebbis username for the driving school',
        example: 'username123',
        required: true
    })
    @IsString()
    mebbis_username: string;

    @ApiProperty({
        description: 'Mebbis password for the driving school',
        example: 'password123',
        required: true
    })
    @IsString()
    mebbis_password: string;
}