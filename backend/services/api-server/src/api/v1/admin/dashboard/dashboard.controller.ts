import { Controller, Get, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../../../../common/guards/admin.guard';
import { DashboardResponseDto } from './dto';
import { DashboardService } from './dashboard.service';
import { DashboardResponse, SystemInfoResponse } from './dashboard.types';



@ApiTags('Dashboard')
@Controller('admin/dashboard')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  
  @Get('')
  @ApiOperation({ summary: 'Get complete admin dashboard data including statistics, recent activities, and system information' })
  @ApiResponse({ status: 200, description: 'Dashboard data with system information retrieved successfully', type: DashboardResponseDto })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getDashboardData(): Promise<DashboardResponse> {
    try {
      const dashboardData = await this.dashboardService.getDashboardData();

      const response: DashboardResponse = {
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      };

      return response;
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      
      // Get detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : 'No stack trace available';
      
      console.error('Detailed error:', {
        message: errorMessage,
        stack: errorStack,
        error
      });
      
      throw new HttpException(
        {
          success: false,
          error: `Failed to retrieve dashboard data: ${errorMessage}`,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && { details: errorStack })
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('system-info')
  @ApiOperation({ summary: 'Get system resource usage and service status' })
  @ApiResponse({ status: 200, description: 'System info retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSystemInfo(): Promise<SystemInfoResponse> {
    try {
      const data = await this.dashboardService.getSystemInfo();
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error getting system info:', error);
      throw new HttpException(
        {
          success: false,
          error: `Failed to retrieve system info: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
