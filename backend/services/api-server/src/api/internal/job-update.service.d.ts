import { Repository } from 'typeorm';
import { JobEntity } from '@surucukursu/shared';
import { SocketGateway } from '../../utils/socket/socket.gateway';
export declare class JobUpdateService {
    private jobRepository;
    private socketGateway;
    private readonly logger;
    constructor(jobRepository: Repository<JobEntity>, socketGateway: SocketGateway);
    handleJobUpdate(payload: {
        jobId: number;
        status: string;
        progress: number;
        message?: string;
        result?: any;
        errorMessage?: string;
        timestamp: string;
    }): Promise<{
        success: boolean;
        jobId: number;
    }>;
}
