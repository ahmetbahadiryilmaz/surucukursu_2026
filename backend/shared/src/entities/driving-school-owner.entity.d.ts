import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
export declare class DrivingSchoolOwnerEntity extends BaseEntity {
    name: string;
    email: string;
    password: string;
    phone: string;
    DrivingSchool: DrivingSchoolEntity[];
}
