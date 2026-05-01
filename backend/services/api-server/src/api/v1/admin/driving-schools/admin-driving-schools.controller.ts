// src/api/v1/admin/driving-schools/admin-driving-schools.controller.ts
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminDrivingSchoolsService } from './admin-driving-schools.service';
import { CreateDrivingSchoolDto, UpdateDrivingSchoolDto } from './dto';
import { AdminGuard } from '../../../../common/guards/admin.guard';

@ApiTags('Driving Schools')
@Controller('admin/driving-schools')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminDrivingSchoolsController {
    constructor(private readonly service: AdminDrivingSchoolsService) { }

    @Get()
    @ApiOperation({ summary: 'Get all driving schools' })
    @ApiResponse({ status: 200, description: 'Returns all driving schools' })
    async getAllDrivingSchools() {
        return this.service.getAllDrivingSchools();
    }

    @Get(':code')
    @ApiOperation({ summary: 'Get driving school by ID' })
    @ApiResponse({ status: 200, description: 'Returns the driving school' })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    async getDrivingSchoolById(@Param('code') id: string) {
        return this.service.getDrivingSchoolById(parseInt(id));
    }

    @Post()
    @ApiOperation({ summary: 'Create new driving school' })
    @ApiResponse({ status: 201, description: 'Driving school created successfully' })
    async createDrivingSchool(@Body() dto: CreateDrivingSchoolDto, @Req() req: any) {
        return this.service.createDrivingSchool(dto, req.user.id);
    }

    @Put(':code')
    @ApiOperation({ summary: 'Update driving school' })
    @ApiResponse({ status: 200, description: 'Driving school updated successfully' })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    async updateDrivingSchool(
        @Param('code') id: string,
        @Body() dto: UpdateDrivingSchoolDto,
        @Req() req: any
    ) {
        return this.service.updateDrivingSchool(parseInt(id), dto, req.user.id);
    }

    @Delete(':code')
    @ApiOperation({ summary: 'Delete driving school' })
    @ApiResponse({ status: 200, description: 'Driving school deleted successfully' })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    async deleteDrivingSchool(@Param('code') id: string, @Req() req: any) {
        return this.service.deleteDrivingSchool(parseInt(id), req.user.id);
    }

    @Post(':code/login-as')
    @ApiOperation({ summary: 'Login as driving school manager' })
    @ApiResponse({ status: 200, description: 'Returns manager access token' })
    @ApiResponse({ status: 404, description: 'Driving school or manager not found' })
    async loginAs(@Param('code') code: string) {
        return this.service.loginAs(code);
    }
}