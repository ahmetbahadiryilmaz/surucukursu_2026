import { ApiProperty } from '@nestjs/swagger';

export class DrivingSchoolCredsDto {
    @ApiProperty({
        description: 'Mebbis username for the driving school',
        example: 'username123'
    })
    mebbis_username: string;

    @ApiProperty({
        description: 'Name of the driving school',
        example: 'School Name'
    })
    name: string;

    @ApiProperty({
        description: 'Whether MEBBIS credentials are locked',
        example: false
    })
    mebbis_credentials_locked?: boolean;
}