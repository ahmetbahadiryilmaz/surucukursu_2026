import { WorkerService } from './worker.service';
export declare class WorkerController {
    private readonly workerService;
    constructor(workerService: WorkerService);
    sendToUser(messageData: {
        userId: number;
        tag: string;
        data: any;
    }, req: any): Promise<{
        success: boolean;
    }>;
    updateJob(jobData: {
        jobId: string;
        progress: number;
        status?: string;
        message?: string;
    }, req: any): Promise<{
        success: boolean;
        job: {
            id: number;
            progress: any;
            status: any;
        };
    }>;
}
