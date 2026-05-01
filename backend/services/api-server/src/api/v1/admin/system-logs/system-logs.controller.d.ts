import { SystemLogsService } from './system-logs.service';
import { GetLogsQueryDto, PaginatedLogsResponseDto } from './dto/get-logs.dto';
export declare class SystemLogsController {
    private readonly service;
    constructor(service: SystemLogsService);
    getLogs(query: GetLogsQueryDto): Promise<PaginatedLogsResponseDto>;
}
