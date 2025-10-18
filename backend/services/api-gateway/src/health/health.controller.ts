import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { HealthService, SystemHealth, ServiceHealth } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get overall system health' })
  @ApiResponse({ 
    status: 200, 
    description: 'System health status',
    type: Object
  })
  async getSystemHealth(): Promise<SystemHealth> {
    return this.healthService.checkSystemHealth();
  }

  @Get('service/:serviceName')
  @ApiOperation({ summary: 'Get specific service health' })
  @ApiParam({ name: 'serviceName', description: 'Name of the service to check' })
  @ApiResponse({ 
    status: 200, 
    description: 'Service health status',
    type: Object
  })
  async getServiceHealth(@Param('serviceName') serviceName: string): Promise<ServiceHealth> {
    return this.healthService.checkServiceHealth(serviceName);
  }

  @Get('ready')
  @ApiOperation({ summary: 'Gateway readiness check' })
  @ApiResponse({ status: 200, description: 'Gateway is ready' })
  async getReadiness() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString()
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Gateway liveness check' })
  @ApiResponse({ status: 200, description: 'Gateway is alive' })
  async getLiveness() {
    return {
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }
}