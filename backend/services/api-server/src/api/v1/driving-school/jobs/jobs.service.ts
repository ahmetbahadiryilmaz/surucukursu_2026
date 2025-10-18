import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobEntity, JobStatus, JobType } from '@surucukursu/shared';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(JobEntity)
    private jobRepository: Repository<JobEntity>,
  ) {}

  async getUserJobs(
    userId: number,
    filters: {
      status?: string;
      type?: string;
      limit: number;
      offset: number;
    },
  ) {
    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .where('job.user_id = :userId', { userId })
      .orderBy('job.created_at', 'DESC')
      .limit(filters.limit)
      .offset(filters.offset);

    if (filters.status) {
      queryBuilder.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters.type) {
      queryBuilder.andWhere('job.type = :type', { type: filters.type });
    }

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return {
      jobs,
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }

  async getDrivingSchoolJobs(
    schoolIds: number[],
    filters: {
      status?: string;
      type?: string;
      limit: number;
      offset: number;
    },
  ) {
    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.school', 'school')
      .where('job.school_id IN (:...schoolIds)', { schoolIds })
      .orderBy('job.created_at', 'DESC')
      .limit(filters.limit)
      .offset(filters.offset);

    if (filters.status) {
      queryBuilder.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters.type) {
      queryBuilder.andWhere('job.type = :type', { type: filters.type });
    }

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return {
      jobs,
      total,
      limit: filters.limit,
      offset: filters.offset,
    };
  }
}