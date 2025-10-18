import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AdminsService } from './admins.service';
import { CreateAdminDto, UpdateAdminDto } from './dto';
import { AdminGuard } from '../../../../common/guards/admin.guard';

@ApiTags('Users')
@Controller('admin/admins')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminsController {
  constructor(private readonly adminService: AdminsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({ status: 200, description: 'Returns all admins' })
  async getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admin by ID' })
  @ApiResponse({ status: 200, description: 'Returns the admin' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiParam({
    name: 'id',
    description: 'ID of the admin',
    example: '1',
  })
  
  async getAdminById(@Param('id') id: string) {
    return this.adminService.getAdminById(parseInt(id));
  }

  @Post()
  @ApiOperation({ summary: 'Create new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @ApiResponse({ status: 409, description: 'Admin with email already exists' })
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update admin' })
  @ApiResponse({ status: 200, description: 'Admin updated successfully' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 409, description: 'Admin with email already exists' })
  @ApiParam({
    name: 'id',
    description: 'ID of the admin',
    example: '1',
  })
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminService.updateAdmin(parseInt(id), dto);
  }
}