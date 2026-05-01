import { Controller, Post, Body, Ip } from '@nestjs/common';
import { JobUpdateService } from './job-update.service';

@Controller('internal')
export class InternalController {
  constructor(private readonly jobUpdateService: JobUpdateService) {}

  @Post('job-update')
  async updateJobProgress(
    @Body() payload: {
      jobId: number;
      status: string;
      progress: number;
      message?: string;
      result?: any;
      errorMessage?: string;
      timestamp: string;
    },
    @Ip() clientIp: string
  ) {
    // Security check: only allow local requests
    if (!this.isLocalRequest(clientIp)) {
      throw new Error('Unauthorized: Only local requests allowed');
    }

    return this.jobUpdateService.handleJobUpdate(payload);
  }

  private isLocalRequest(ip: string): boolean {
    // Allow localhost, 127.0.0.1, and local network IPs
    return ip === '127.0.0.1' ||
           ip === '::1' ||
           ip === '::ffff:127.0.0.1' ||
           ip.startsWith('192.168.') ||
           ip.startsWith('10.') ||
           ip.startsWith('172.');
  }
}