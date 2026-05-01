import { BaseEntity } from './base.entity';
export declare class SessionEntity extends BaseEntity {
    token: string;
    expires_at: number;
    last_activity: number;
    last_login: number;
    user_type?: number;
    user_id: number;
}
