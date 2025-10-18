import { Controller, Get, UseGuards, Param } from '@nestjs/common';
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
}