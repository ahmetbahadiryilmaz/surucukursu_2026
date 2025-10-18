import { ApiProperty } from '@nestjs/swagger';

export class DrivingSchoolCredsDto {
    @ApiProperty({
        description: 'Mebbis username for the driving school',
        example: 'username123'
    })
    mebbis_username: string;
    name: string;
}