import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { AuthGuard } from '../../../../common/guards/auth.guard';
import { RequestWithUser } from '../../auth/dto/types';

@ApiTags('Jobs')
@Controller('driving-school/jobs')
@UseGuards(AuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getJobs(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.jobsService.getUserJobs(req.user.id, {
      status,
      type,
      limit: limit || 50,
      offset: offset || 0,
    });
  }

  @Get('driving-school')
  @ApiOperation({ summary: 'Get driving school jobs' })
  @ApiResponse({ status: 200, description: 'Driving school jobs retrieved successfully' })
  async getDrivingSchoolJobs(
    @Req() req: RequestWithUser,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // Get school IDs from user's driving schools
    const schoolIds = req.user.drivingSchools?.map(school => school.id) || [];

    if (schoolIds.length === 0) {
      return {
        jobs: [],
        total: 0,
        limit: limit || 50,
        offset: offset || 0,
      };
    }

    return await this.jobsService.getDrivingSchoolJobs(schoolIds, {
      status,
      type,
      limit: limit || 50,
      offset: offset || 0,
    });
  }
}