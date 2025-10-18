// src/api/v1/admin/driving-schools/dto/create-driving-school.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    email: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone: string;
}

export class CreateSubscriptionDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    type: string; // 'demo' or 'unlimited'

    @ApiProperty()
    @IsOptional()
    ends_at?: string;

    @ApiProperty()
    @IsOptional()
    pdf_print_limit?: number;
}

export class CreateDrivingSchoolDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone: string;

    @ApiProperty()
    owner_id: number;

    @ApiProperty()
    manager_id: number;

    @ApiProperty()
    @IsOptional()
    city_id?: number;

    @ApiProperty()
    @IsOptional()
    district_id?: number;

    @ApiProperty()
    @IsOptional()
    subscription?: CreateSubscriptionDto;
}

export class UpdateDrivingSchoolDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    address: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsNotEmpty()
    @ApiProperty()
    owner_id: number;

    @IsNotEmpty()
    @ApiProperty()
    manager_id: number;

    @ApiProperty()
    @IsOptional()
    city_id?: number;

    @ApiProperty()
    @IsOptional()
    district_id?: number;

    @ApiProperty()
    @IsOptional()
    subscription?: CreateSubscriptionDto;
}