import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DrivingSchoolGuard } from '../../../../common/guards/driving-school.guard';
import { DashboardResponse } from '../../admin/dashboard';

@ApiTags('Driving School Dashboard')
@Controller('driving-school/:code/dashboard')
@UseGuards(DrivingSchoolGuard)
@ApiBearerAuth()
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get()
    @ApiOperation({ summary: 'Get driving school dashboard data' })
    @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    async getDashboardData(@Param('code') code: string): Promise<DashboardResponse> {
        return this.dashboardService.getDashboardData(code);
    }
}