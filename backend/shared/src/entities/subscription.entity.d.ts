import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
export declare class SubscriptionEntity extends BaseEntity {
    driving_school_id: number;
    type: string;
    pdf_print_limit?: number;
    pdf_print_used: number;
    ends_at?: number;
    driving_school: DrivingSchoolEntity;
}
