import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CarsService } from './cars.service';
import { DrivingSchoolGuard } from '../../../../common/guards/driving-school.guard';

@ApiTags('Driving School Cars')
@Controller('driving-school/:code/cars')
@UseGuards(DrivingSchoolGuard)
@ApiBearerAuth()
export class CarsController {
    constructor(private readonly carsService: CarsService) { }

    @Get()
    @ApiOperation({ summary: 'Get cars of driving school' })
    @ApiResponse({ status: 200, description: 'Cars retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Cars not found' })
    async getCars(@Param('code') code: string) {
        return this.carsService.getCars(code);
    }
}