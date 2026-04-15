import { JobType } from '@surucukursu/shared';
export declare class GenerateSinglePdfDto {
    jobType: JobType;
    studentId: number;
    template?: string;
    data?: Record<string, any>;
}
export declare class PdfGenerationResponseDto {
    jobId: string;
    message: string;
    estimatedTime: number;
}
