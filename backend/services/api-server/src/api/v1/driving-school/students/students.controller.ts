import { Controller, Get, Post, UseGuards, Param, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { DrivingSchoolGuard } from '../../../../common/guards/driving-school.guard';

@ApiTags('Driving School Students')
@Controller('driving-school/:code/students')
@UseGuards(DrivingSchoolGuard)
@ApiBearerAuth()
export class StudentsController {
    constructor(private readonly studentsService: StudentsService) { }

    @Get()
    @ApiOperation({ summary: 'Get students of driving school' })
    @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Students not found' })
    async getStudents(@Param('code') code: string) {
        return this.studentsService.getStudents(code);
    }

    @Post('sync')
    @ApiOperation({ summary: 'Sync students from MEBBIS service' })
    @ApiResponse({ status: 200, description: 'Students synced successfully' })
    @ApiResponse({ status: 400, description: 'Sync failed' })
    async syncStudents(@Param('code') code: string, @Body() body?: { ajandasKodu?: string }) {
        return this.studentsService.syncStudents(code, body?.ajandasKodu);
    }
}