import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WorkerService } from './worker.service';
import { LocalOnlyGuard } from '../../../common/guards/local-only.guard';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Worker')
@Controller('worker')
export class WorkerController {
  constructor(private readonly workerService: WorkerService) {}

  @Post('sendtouser')
  @Public()
  @UseGuards(LocalOnlyGuard)
  @ApiOperation({ summary: 'Send message to specific user via Socket.IO' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  async sendToUser(@Body() messageData: { userId: number; tag: string; data: any }, @Req() req: any) {
    return await this.workerService.sendMessageToUser(messageData.userId, messageData.tag, messageData.data);
  }

  @Post('update-job')
  @Public()
  @UseGuards(LocalOnlyGuard)
  @ApiOperation({ summary: 'Update job status and progress' })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  async updateJob(@Body() jobData: { jobId: string; progress: number; status?: string; message?: string }, @Req() req: any) {
    return await this.workerService.updateJob(jobData.jobId, jobData.progress, jobData.status, jobData.message);
  }
}