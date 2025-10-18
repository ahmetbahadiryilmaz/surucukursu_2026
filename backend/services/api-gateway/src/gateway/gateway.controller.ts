import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GatewayService } from './gateway.service';

@ApiTags('Gateway')
@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @Get()
  @ApiOperation({ summary: 'Gateway status' })
  @ApiResponse({ status: 200, description: 'Gateway is running' })
  getStatus() {
    return this.gatewayService.getStatus();
  }

  @Get('version')
  @ApiOperation({ summary: 'Gateway version' })
  @ApiResponse({ status: 200, description: 'Gateway version information' })
  getVersion() {
    return this.gatewayService.getVersion();
  }
}