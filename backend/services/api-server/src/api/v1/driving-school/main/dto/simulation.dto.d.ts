import { SimulationType, JobType } from '@surucukursu/shared';
export declare class GenerateSingleSimulationDto {
    jobType: JobType;
    studentId: number;
    simulationType: SimulationType;
    template?: string;
}
export declare class GenerateGroupSimulationDto {
    jobType: JobType;
    studentIds: number[];
    simulationType: SimulationType;
    template?: string;
}
export declare class GenerateSingleDireksiyonTakipDto {
    jobType: JobType;
    studentId: number;
    template?: string;
}
export declare class GenerateGroupDireksiyonTakipDto {
    jobType: JobType;
    studentIds: number[];
    template?: string;
}
export declare class JobResponseDto {
    jobId: string;
    jobType: string;
    message: string;
    estimatedTime: number;
}
