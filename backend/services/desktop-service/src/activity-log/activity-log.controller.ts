import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DesktopAuthGuard } from '../common/guards/desktop-auth.guard';
import { ActivityLogDto, ActivityLogService } from './activity-log.service';

@ApiTags('Desktop Activity Log')
@Controller('activity-log')
@UseGuards(DesktopAuthGuard)
@ApiBearerAuth()
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Record a desktop activity event (best-effort logging)' })
  @ApiResponse({ status: 200, description: 'Logged (always 200)' })
  async log(@Req() req: any, @Body() body: ActivityLogDto) {
    await this.activityLogService.record(req.user, body);
    return { success: true };
  }
}
