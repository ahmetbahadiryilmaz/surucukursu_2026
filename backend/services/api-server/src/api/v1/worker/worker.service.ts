import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { SocketGateway } from '../../../utils/socket/socket.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity, JobStatus } from '@surucukursu/shared';

@Injectable()
export class WorkerService {
  constructor(
    @Inject(forwardRef(() => SocketGateway))
    private socketGateway: SocketGateway,
    @InjectRepository(JobEntity)
    private jobRepository: Repository<JobEntity>,
  ) {}

  async sendMessageToUser(userId: number, tag: string, data: any) {
    this.socketGateway.emitToUser(userId, tag, data);
    return { success: true };
  }

  async updateJob(jobId: string, progress: number, status?: string, message?: string) {
    const job = await this.jobRepository.findOne({ where: { id: parseInt(jobId) } });
    if (!job) {
      throw new Error(`Job with id ${jobId} not found`);
    }

    // Update job with progress and status
    const updates: any = {
      progress_percentage: Math.max(0, Math.min(100, progress)) // Ensure progress is between 0-100
    };

    if (status) {
      updates.status = status === 'completed' ? JobStatus.COMPLETED :
                      status === 'failed' ? JobStatus.FAILED :
                      status === 'processing' ? JobStatus.PROCESSING : job.status;
    } else {
      // Auto-determine status based on progress
      updates.status = progress === 100 ? JobStatus.COMPLETED :
                      progress < 0 ? JobStatus.FAILED :
                      JobStatus.PROCESSING;
    }

    if (updates.status === JobStatus.COMPLETED && !job.completed_at) {
      updates.completed_at = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    }

    if (updates.status === JobStatus.FAILED && message) {
      updates.error_message = message;
    }

    await this.jobRepository.update(job.id, updates);

    // Emit socket event to user (using school_id) with progress information
    this.socketGateway.emitToUser(job.school_id, 'job-update', {
      jobId: job.id.toString(),
      progress: updates.progress_percentage,
      status: updates.status,
      message: message || '',
      type: job.type,
      timestamp: new Date().toISOString()
    });

    return { 
      success: true, 
      job: {
        id: job.id,
        progress: updates.progress_percentage,
        status: updates.status
      }
    };
  }
}