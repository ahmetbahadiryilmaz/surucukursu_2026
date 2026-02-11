import { Controller, Get, Post, UseGuards, Param, Body } from '@nestjs/common';
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

    @Post('sync')
    @ApiOperation({ summary: 'Sync cars from MEBBIS service' })
    @ApiResponse({ status: 200, description: 'Cars synced successfully' })
    @ApiResponse({ status: 400, description: 'Sync failed' })
    async syncCars(@Param('code') code: string, @Body() body?: { ajandasKodu?: string }) {
        return this.carsService.syncCars(code, body?.ajandasKodu);
    }
}