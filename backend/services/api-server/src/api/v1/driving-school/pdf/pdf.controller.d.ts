import { PdfService } from './pdf.service';
import { GenerateSinglePdfDto, PdfGenerationResponseDto } from '../main/dto/pdf.dto';
import { GenerateSingleSimulationDto, GenerateGroupSimulationDto, GenerateSingleDireksiyonTakipDto, GenerateGroupDireksiyonTakipDto, JobResponseDto } from '../main/dto/simulation.dto';
import { JobType } from '@surucukursu/shared';
export declare class PdfController {
    private readonly pdfService;
    constructor(pdfService: PdfService);
    generateSinglePdf(code: string, dto: GenerateSinglePdfDto): Promise<PdfGenerationResponseDto>;
    generateGroupPdf(code: string, dto: {
        jobType: JobType;
        studentIds: number[];
        template?: string;
        data?: any[];
    }): Promise<{
        jobId: any;
        message: string;
        estimatedTime: number;
    }>;
    generateSingleSimulation(code: string, dto: GenerateSingleSimulationDto): Promise<JobResponseDto>;
    generateGroupSimulation(code: string, dto: GenerateGroupSimulationDto): Promise<JobResponseDto>;
    generateSingleDireksiyonTakip(code: string, dto: GenerateSingleDireksiyonTakipDto): Promise<JobResponseDto>;
    generateGroupDireksiyonTakip(code: string, dto: GenerateGroupDireksiyonTakipDto): Promise<JobResponseDto>;
    handlePdfProgress(code: string, payload: {
        userId: number;
        tag: string;
        data: {
            jobId: string;
            progress: number;
            message: string;
            timestamp: string;
            pdfData?: string;
        };
    }): Promise<{
        success: boolean;
        jobId: string;
    }>;
}
