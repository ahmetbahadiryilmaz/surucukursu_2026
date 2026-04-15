import { JobsService } from './jobs.service';
import { RequestWithUser } from '../../auth/dto/types';
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    getJobs(req: RequestWithUser, status?: string, type?: string, limit?: number, offset?: number): Promise<{
        jobs: import("@surucukursu/shared").JobEntity[];
        total: number;
        limit: number;
        offset: number;
    }>;
    getDrivingSchoolJobs(req: RequestWithUser, status?: string, type?: string, limit?: number, offset?: number): Promise<{
        jobs: import("@surucukursu/shared").JobEntity[];
        total: number;
        limit: number;
        offset: number;
    }>;
}
