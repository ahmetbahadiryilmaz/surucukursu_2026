import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
export declare class DrivingSchoolSettingsEntity extends BaseEntity {
    driving_school_id: number;
    simulator_type?: string;
    notification_preferences: number;
    driving_school: DrivingSchoolEntity;
}
