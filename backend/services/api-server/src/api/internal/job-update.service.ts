import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity, JobStatus, JobType } from '@surucukursu/shared';
import { appLogger } from '@surucukursu/shared';
import { SocketGateway } from '../../utils/socket/socket.gateway';

@Injectable()
export class JobUpdateService {
  private readonly logger = new Logger(JobUpdateService.name);

  constructor(
    @InjectRepository(JobEntity)
    private jobRepository: Repository<JobEntity>,
    @Inject(forwardRef(() => SocketGateway))
    private socketGateway: SocketGateway,
  ) {}

  async handleJobUpdate(payload: {
    jobId: number;
    status: string;
    progress: number;
    message?: string;
    result?: any;
    errorMessage?: string;
    timestamp: string;
  }) {
    const { jobId, status, progress, message, result, errorMessage } = payload;

    try {
      // Update job in database
      const updateData: any = {
        status: status as JobStatus,
        progress_percentage: progress,
        updated_at: Math.floor(Date.now() / 1000)
      };

      if (result) {
        if (result.filePath) updateData.file_path = result.filePath;
        if (result.fileUrl) updateData.file_url = result.fileUrl;
        if (result.completedAt) updateData.completed_at = result.completedAt;
        updateData.result = result;
      }

      if (errorMessage) {
        updateData.error_message = errorMessage;
      }

      await this.jobRepository.update(jobId, updateData);

      // Get the job to access school_id for socket emission
      const updatedJob = await this.jobRepository.findOne({ where: { id: jobId } });
      
      if (updatedJob) {
        // Emit socket event to notify frontend of job update
        this.socketGateway.emitToUser(updatedJob.school_id, 'job-update', {
          jobId: updatedJob.id.toString(),
          progress: progress,
          status: status,
          message: message || '',
          type: updatedJob.type,
          timestamp: new Date().toISOString()
        });
      }

      this.logger.log(`Job ${jobId} updated: ${status} (${progress}%)`);
      appLogger.business(`Job progress update: ${jobId} - ${status} - ${progress}%`, {
        message,
        hasResult: !!result,
        hasError: !!errorMessage
      });

      return { success: true, jobId };
    } catch (error) {
      this.logger.error(`Failed to update job ${jobId}`, error);
      appLogger.error('Job update failed', { jobId, error: error.message });
      throw error;
    }
  }
}