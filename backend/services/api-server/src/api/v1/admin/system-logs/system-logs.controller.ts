import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SystemLogsService } from './system-logs.service';
import { GetLogsQueryDto, PaginatedLogsResponseDto } from './dto/get-logs.dto';
import { AdminGuard } from '../../../../common/guards/admin.guard';

@ApiTags('System Logs')
@Controller('admin/system-logs')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class SystemLogsController {
  constructor(private readonly service: SystemLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get system logs with pagination and filtering' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns paginated system logs', 
    type: PaginatedLogsResponseDto 
  })
  async getLogs(@Query() query: GetLogsQueryDto): Promise<PaginatedLogsResponseDto> {
    return this.service.getLogs(query);
  }
}