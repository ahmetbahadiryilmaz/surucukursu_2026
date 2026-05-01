import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginAsDto {
    @ApiProperty({
        description: 'Code of the driving school to login as manager',
        example: '123'
    })
    @IsString()
    code: string;
}