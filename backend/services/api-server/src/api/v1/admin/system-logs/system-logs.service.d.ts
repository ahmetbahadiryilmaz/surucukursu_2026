import { Repository } from 'typeorm';
import { SystemLogsEntity } from '@surucukursu/shared';
import { GetLogsQueryDto, PaginatedLogsResponseDto } from './dto/get-logs.dto';
export declare class SystemLogsService {
    private readonly systemLogsRepository;
    constructor(systemLogsRepository: Repository<SystemLogsEntity>);
    getLogs(query: GetLogsQueryDto): Promise<PaginatedLogsResponseDto>;
}
