import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminDrivingSchoolOwnersService } from './admin-driving-school-owners.service';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';
import { AdminGuard } from '../../../../common/guards/admin.guard';

@ApiTags('Driving School Owners')
@Controller('admin/driving-school-owners')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminDrivingSchoolOwnersController {
    constructor(private readonly service: AdminDrivingSchoolOwnersService) { }

    @Get()
    @ApiOperation({ summary: 'Get all driving school owners' })
    @ApiResponse({ status: 200, description: 'Returns all driving school owners' })
    async getAllOwners() {
        return this.service.getAllOwners();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get driving school owner by ID' })
    @ApiResponse({ status: 200, description: 'Returns the driving school owner' })
    @ApiResponse({ status: 404, description: 'Owner not found' })
    async getOwnerById(@Param('id') id: string) {
        return this.service.getOwnerById(parseInt(id));
    }

    @Post()
    @ApiOperation({ summary: 'Create new driving school owner' })
    @ApiResponse({ status: 201, description: 'Owner created successfully' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    async createOwner(@Body() dto: CreateOwnerDto) {
        return this.service.createOwner(dto);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update driving school owner' })
    @ApiResponse({ status: 200, description: 'Owner updated successfully' })
    @ApiResponse({ status: 404, description: 'Owner not found' })
    @ApiResponse({ status: 409, description: 'Email already in use' })
    async updateOwner(
        @Param('id') id: string,
        @Body() dto: UpdateOwnerDto
    ) {
        return this.service.updateOwner(parseInt(id), dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete driving school owner' })
    @ApiResponse({ status: 200, description: 'Owner deleted successfully' })
    @ApiResponse({ status: 404, description: 'Owner not found' })
    @ApiResponse({ status: 409, description: 'Cannot delete owner assigned to schools' })
    async deleteOwner(@Param('id') id: string) {
        return this.service.deleteOwner(parseInt(id));
    }
}