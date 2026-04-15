import { SocketGateway } from '../../../utils/socket/socket.gateway';
import { Repository } from 'typeorm';
import { JobEntity } from '@surucukursu/shared';
export declare class WorkerService {
    private socketGateway;
    private jobRepository;
    constructor(socketGateway: SocketGateway, jobRepository: Repository<JobEntity>);
    sendMessageToUser(userId: number, tag: string, data: any): Promise<{
        success: boolean;
    }>;
    updateJob(jobId: string, progress: number, status?: string, message?: string): Promise<{
        success: boolean;
        job: {
            id: number;
            progress: any;
            status: any;
        };
    }>;
}
