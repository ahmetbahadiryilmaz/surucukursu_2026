import { Repository } from 'typeorm';
import { JobEntity } from '@surucukursu/shared';
export declare class JobsService {
    private jobRepository;
    constructor(jobRepository: Repository<JobEntity>);
    getUserJobs(userId: number, filters: {
        status?: string;
        type?: string;
        limit: number;
        offset: number;
    }): Promise<{
        jobs: JobEntity[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getDrivingSchoolJobs(schoolIds: number[], filters: {
        status?: string;
        type?: string;
        limit: number;
        offset: number;
    }): Promise<{
        jobs: JobEntity[];
        total: number;
        limit: number;
        offset: number;
    }>;
}
