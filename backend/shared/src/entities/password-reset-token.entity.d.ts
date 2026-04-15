import { BaseEntity } from './base.entity';
export declare class PasswordResetTokenEntity extends BaseEntity {
    token: string;
    email: string;
    expires_at: number;
    used: boolean;
}
