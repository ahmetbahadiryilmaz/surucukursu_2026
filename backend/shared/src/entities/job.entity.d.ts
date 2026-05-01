import { BaseEntity } from './base.entity';
import { DrivingSchoolEntity } from './driving-school.entity';
import { JobStatus, JobType, SimulationType, SyncCarsStage } from '../types/job.types';
export declare class JobEntity extends BaseEntity {
    type: JobType;
    simulation_type?: SimulationType;
    sync_stage?: SyncCarsStage;
    status: JobStatus;
    progress_percentage: number;
    error_message?: string;
    school_id: number;
    school: DrivingSchoolEntity;
    completed_at?: number;
}
