import { Repository } from 'typeorm';
import { DrivingSchoolEntity, JobEntity, JobType } from '@surucukursu/shared';
import { GenerateSinglePdfDto, PdfGenerationResponseDto } from '../main/dto/pdf.dto';
import { GenerateSingleSimulationDto, GenerateGroupSimulationDto, GenerateSingleDireksiyonTakipDto, GenerateGroupDireksiyonTakipDto, JobResponseDto } from '../main/dto/simulation.dto';
import { SocketGateway } from '../../../../utils/socket/socket.gateway';
import { RabbitMQService } from '../../../../utils/rabbitmq';
export declare class PdfService {
    private readonly drivingSchoolRepository;
    private readonly jobRepository;
    private socketGateway;
    private readonly rabbitMQService;
    private readonly queueName;
    private readonly logger;
    constructor(drivingSchoolRepository: Repository<DrivingSchoolEntity>, jobRepository: Repository<JobEntity>, socketGateway: SocketGateway, rabbitMQService: RabbitMQService);
    queueSinglePdfGeneration(code: string, dto: GenerateSinglePdfDto): Promise<PdfGenerationResponseDto>;
    queueGroupPdfGeneration(code: string, dto: {
        jobType: JobType;
        studentIds: number[];
        template?: string;
        data?: any[];
    }): Promise<{
        jobId: any;
        message: string;
        estimatedTime: number;
    }>;
    queueSingleSimulation(code: string, dto: GenerateSingleSimulationDto): Promise<JobResponseDto>;
    queueGroupSimulation(code: string, dto: GenerateGroupSimulationDto): Promise<JobResponseDto>;
    queueSingleDireksiyonTakip(code: string, dto: GenerateSingleDireksiyonTakipDto): Promise<JobResponseDto>;
    queueGroupDireksiyonTakip(code: string, dto: GenerateGroupDireksiyonTakipDto): Promise<JobResponseDto>;
    private sendToQueue;
    handlePdfProgressUpdate(payload: {
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
