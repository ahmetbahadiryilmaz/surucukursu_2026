import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
export declare enum CarType {
    REGULAR_CAR = "regular_car",
    SIMULATOR = "simulator"
}
export declare class DrivingSchoolCarEntity extends BaseEntity {
    car_type: CarType;
    model: string;
    brand: string;
    plate_number: string;
    year: number;
    purchase_date: Date;
    last_inspection_date: Date;
    inspection_validity_date: Date;
    driver_count: number;
    lesson_count: number;
    excuse_days: number;
    serial_number: string;
    start_date: Date;
    last_maintenance_date: Date;
    usage_hours: number;
    license_validity_date: Date;
    status: string;
    school_id: number;
    school: DrivingSchoolEntity;
}
