import { BaseEntity } from './base.entity';
export declare class SystemLogsEntity extends BaseEntity {
    user_id: number;
    user_type: number;
    process: number;
    description: string;
}
