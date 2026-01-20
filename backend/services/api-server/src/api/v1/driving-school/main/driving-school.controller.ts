import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { DrivingSchoolService } from './driving-school.service';
import { UpdateDrivingSchoolCredsDto } from './dto/update-driving-school-creds.dto';
import { DrivingSchoolCredsDto } from './dto/driving-school-creds.dto';
import { UpdateDrivingSchoolSettingsDto } from './dto/update-driving-school-settings.dto';
import { DrivingSchoolSettingsDto } from './dto/driving-school-settings.dto';
import { DrivingSchoolGuard } from '../../../../common/guards/driving-school.guard';

@ApiTags('Driving Schools')
@Controller('driving-school/:code')
@UseGuards(DrivingSchoolGuard)
@ApiBearerAuth()
export class DrivingSchoolController {
    constructor(private readonly drivingSchoolService: DrivingSchoolService) { }

    @Get('info')
    @ApiOperation({ summary: 'Get driving school information' })
    @ApiResponse({ status: 200, description: 'Driving school info retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    async getDrivingSchoolInfo(@Param('code') code: string) {
        return this.drivingSchoolService.getDrivingSchoolInfo(code);
    }

    @Get('creds')
    @ApiOperation({
        summary: 'Get Mebbis Credentials',
        description: 'Retrieves the Mebbis credentials for a specific driving school'
    })
    @ApiResponse({
        status: 200,
        description: 'Credentials retrieved successfully',
        type: DrivingSchoolCredsDto
    })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    @ApiParam({
        name: 'code',
        description: 'The unique code of the driving school',
        example: '123',
        required: true
    })
    async getCreds(@Param('code') code: string) {
        return this.drivingSchoolService.getCreds(code);
    }

    @Post('creds')
    @ApiOperation({
        summary: 'Update Creds Of Mebbis',
        description: 'Updates the Mebbis credentials for a specific driving school'
    })
    @ApiResponse({
        status: 200,
        description: 'Creds Updated Successfully',
        type: UpdateDrivingSchoolCredsDto
    })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiParam({
        name: 'code',
        description: 'The unique code of the driving school',
        example: '123',
        required: true
    })
    async updateCreds(
        @Param('code') code: string,
        @Body() dto: UpdateDrivingSchoolCredsDto
    ) {
        return this.drivingSchoolService.updateCreds(code, dto);
    }

    @Get('settings')
    @ApiOperation({
        summary: 'Get Driving School Settings',
        description: 'Retrieves the settings for a specific driving school including simulator type and notification preferences'
    })
    @ApiResponse({
        status: 200,
        description: 'Settings retrieved successfully',
        type: DrivingSchoolSettingsDto
    })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    @ApiParam({
        name: 'code',
        description: 'The unique code of the driving school',
        example: '123',
        required: true
    })
    async getSettings(@Param('code') code: string) {
        return this.drivingSchoolService.getSettings(code);
    }

    @Put('settings')
    @ApiOperation({
        summary: 'Update Driving School Settings',
        description: 'Updates the settings for a specific driving school including simulator type and notification preferences'
    })
    @ApiResponse({
        status: 200,
        description: 'Settings updated successfully'
    })
    @ApiResponse({ status: 404, description: 'Driving school not found' })
    @ApiResponse({ status: 400, description: 'Invalid input data' })
    @ApiParam({
        name: 'code',
        description: 'The unique code of the driving school',
        example: '123',
        required: true
    })
    async updateSettings(
        @Param('code') code: string,
        @Body() dto: UpdateDrivingSchoolSettingsDto
    ) {
        return this.drivingSchoolService.updateSettings(code, dto);
    }
}