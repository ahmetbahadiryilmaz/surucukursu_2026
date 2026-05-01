import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminDrivingSchoolManagersService } from './admin-driving-school-managers.service';
import { CreateManagerDto, UpdateManagerDto } from './dto';
import { AdminGuard } from '../../../../common/guards/admin.guard';

@ApiTags('Driving School Managers')
@Controller('admin/driving-school-managers')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminDrivingSchoolManagersController {
    constructor(private readonly service: AdminDrivingSchoolManagersService) { }

    @Get()
    @ApiOperation({ summary: 'Get all driving school managers' })
    @ApiResponse({ status: 200, description: 'Returns all driving school managers' })
    async getAllManagers() {
        return this.service.getAllManagers();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get driving school manager by ID' })
    @ApiResponse({ status: 200, description: 'Returns the driving school manager' })
    @ApiResponse({ status: 404, description: 'Manager not found' })
    async getManagerById(@Param('id') id: string) {
        return this.service.getManagerById(parseInt(id));
    }

    @Post()
    @ApiOperation({ summary: 'Create new driving school manager' })
    @ApiResponse({ status: 201, description: 'Manager created successfully' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    async createManager(@Body() dto: CreateManagerDto) {
        return this.service.createManager(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update driving school manager' })
    @ApiResponse({ status: 200, description: 'Manager updated successfully' })
    @ApiResponse({ status: 404, description: 'Manager not found' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    async updateManager(
        @Param('id') id: string,
        @Body() dto: UpdateManagerDto
    ) {
        return this.service.updateManager(parseInt(id), dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete driving school manager' })
    @ApiResponse({ status: 200, description: 'Manager deleted successfully' })
    @ApiResponse({ status: 404, description: 'Manager not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete manager assigned to schools' })
    async deleteManager(@Param('id') id: string) {
        return this.service.deleteManager(parseInt(id));
    }
}