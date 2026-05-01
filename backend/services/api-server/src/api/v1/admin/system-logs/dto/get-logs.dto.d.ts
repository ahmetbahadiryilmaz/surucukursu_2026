import { SystemLogProcessTypes, UserTypes } from '../../../auth/dto/enum';
export declare class GetLogsQueryDto {
    page?: number;
    limit?: number;
    userId?: number;
    userType?: UserTypes;
    process?: SystemLogProcessTypes;
}
export declare class LogResponseDto {
    id: number;
    user_id: number;
    user_type: UserTypes;
    process: SystemLogProcessTypes;
    admin_id: number | null;
    description: string;
    created_at: Date;
}
export declare class PaginatedLogsResponseDto {
    data: LogResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
