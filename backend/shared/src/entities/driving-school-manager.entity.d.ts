import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
export declare class DrivingSchoolManagerEntity extends BaseEntity {
    name: string;
    email: string;
    password: string;
    phone: string;
    schools: DrivingSchoolEntity[];
}
