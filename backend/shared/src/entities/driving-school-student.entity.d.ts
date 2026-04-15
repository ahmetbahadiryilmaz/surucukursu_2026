import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
export declare class DrivingSchoolStudentEntity extends BaseEntity {
    name: string;
    email?: string;
    phone: string;
    tc_number: string;
    school_id: number;
    donem: string;
    donem_text: string;
    license_class: string;
    mebbis_status: string;
    approval_status: string;
    ilce_mem_approval: string;
    exam_date: string;
    criminal_record_check: string;
    practice_lessons: string;
    practice_rights: string;
    eexam_rights: string;
    last_synced_at: number;
    school: DrivingSchoolEntity;
}
