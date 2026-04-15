import { JobUpdateService } from './job-update.service';
export declare class InternalController {
    private readonly jobUpdateService;
    constructor(jobUpdateService: JobUpdateService);
    updateJobProgress(payload: {
        jobId: number;
        status: string;
        progress: number;
        message?: string;
        result?: any;
        errorMessage?: string;
        timestamp: string;
    }, clientIp: string): Promise<{
        success: boolean;
        jobId: number;
    }>;
    private isLocalRequest;
}
