import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolEntity, JobEntity, JobStatus, JobType, SimulationType } from '@surucukursu/shared';
import { GenerateSinglePdfDto, PdfGenerationResponseDto } from '../main/dto/pdf.dto';
import {
    GenerateSingleSimulationDto,
    GenerateGroupSimulationDto,
    GenerateSingleDireksiyonTakipDto,
    GenerateGroupDireksiyonTakipDto,
    JobResponseDto
} from '../main/dto/simulation.dto';
import { env } from '@surucukursu/shared';
import { PdfGenerationMode, PdfGenerationRequest } from '@surucukursu/shared';
import { SocketGateway } from '../../../../utils/socket/socket.gateway';
import { RabbitMQService } from '../../../../utils/rabbitmq';

@Injectable()
export class PdfService {
    private readonly queueName = env.rabbitmq.queueName;
    private readonly logger = new Logger(PdfService.name);

    constructor(
      @InjectRepository(DrivingSchoolEntity)
      private readonly drivingSchoolRepository: Repository<DrivingSchoolEntity>,
      @InjectRepository(JobEntity)
      private readonly jobRepository: Repository<JobEntity>,
      @Inject(forwardRef(() => SocketGateway))
      private socketGateway: SocketGateway,
      private readonly rabbitMQService: RabbitMQService,
    ) {}

    async queueSinglePdfGeneration(code: string, dto: GenerateSinglePdfDto): Promise<PdfGenerationResponseDto> {
        // Validate job type
        if (!dto.jobType) {
            throw new Error('Job type is required');
        }

        // Get driving school info to get the owner/manager user ID
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;

        // Create job in database first to get auto-generated ID
        const result = await this.jobRepository.query(
            `INSERT INTO jobs (type, status, school_id, progress_percentage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
            [dto.jobType, JobStatus.PENDING, drivingSchool.id, 0]
        );

        const jobId = result.insertId.toString();

        const request: PdfGenerationRequest = {
            id: jobId,
            type: dto.jobType,
            mode: PdfGenerationMode.SINGLE,
            userId: userId,
            data: {
                drivingSchoolId: code, // Pass driving school ID for folder naming (DS[id])
                studentId: dto.studentId,
                template: dto.template || 'certificate',
                data: dto.data || {},
            },
        };

        await this.sendToQueue(request);

        return {
            jobId,
            message: 'PDF generation request queued successfully',
            estimatedTime: 30, // 30 seconds for single PDF
        };
    }

    async queueGroupPdfGeneration(code: string, dto: { jobType: JobType; studentIds: number[]; template?: string; data?: any[] }) {
        // Validate job type
        if (!dto.jobType) {
            throw new Error('Job type is required');
        }

        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        // Get current user from request context (assuming it's available)
        // For now, we'll use a placeholder - this should be injected properly
        const userId = 1; // TODO: Get from request context

        // Create job in database first to get auto-generated ID
        const result = await this.jobRepository.query(
            `INSERT INTO jobs (type, status, school_id, progress_percentage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
            [dto.jobType, JobStatus.PENDING, drivingSchool.id, 0]
        );

        const jobId = result.insertId.toString();

        const request: PdfGenerationRequest = {
            id: jobId,
            type: dto.jobType,
            mode: PdfGenerationMode.GROUP,
            userId: userId,
            data: {
                drivingSchoolId: code, // Pass driving school ID for folder naming (DS[id])
                studentIds: dto.studentIds,
                template: dto.template || 'certificate',
                data: dto.data || [],
            },
        };

        await this.sendToQueue(request);

        return {
            jobId,
            message: 'Group PDF generation request queued successfully',
            estimatedTime: dto.studentIds.length * 30, // 30 seconds per PDF
        };
    }

    async queueSingleSimulation(code: string, dto: GenerateSingleSimulationDto): Promise<JobResponseDto> {
        // Validate job type
        if (!dto.jobType || dto.jobType !== JobType.SINGLE_SIMULATION) {
            throw new Error('Job type must be SINGLE_SIMULATION');
        }

        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;

        // Create job in database
        const result = await this.jobRepository.query(
            `INSERT INTO jobs (type, status, school_id, progress_percentage, simulation_type, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
            [dto.jobType, JobStatus.PENDING, drivingSchool.id, 0, dto.simulationType]
        );

        const jobId = result.insertId.toString();

        const request: PdfGenerationRequest = {
            id: jobId,
            type: dto.jobType,
            mode: PdfGenerationMode.SINGLE,
            userId: userId,
            simulationType: dto.simulationType,
            data: {
                drivingSchoolId: code,
                studentId: dto.studentId,
                template: dto.template || 'simulation',
                data: {},
            },
        };

        await this.sendToQueue(request);

        return {
            jobId,
            jobType: dto.jobType,
            message: 'Single simulation job queued successfully',
            estimatedTime: 60,
        };
    }

    async queueGroupSimulation(code: string, dto: GenerateGroupSimulationDto): Promise<JobResponseDto> {
        // Validate job type
        if (!dto.jobType || dto.jobType !== JobType.GROUP_SIMULATION) {
            throw new Error('Job type must be GROUP_SIMULATION');
        }

        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;

        // Create job in database
        const result = await this.jobRepository.query(
            `INSERT INTO jobs (type, status, school_id, progress_percentage, simulation_type, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
            [dto.jobType, JobStatus.PENDING, drivingSchool.id, 0, dto.simulationType]
        );

        const jobId = result.insertId.toString();

        const request: PdfGenerationRequest = {
            id: jobId,
            type: dto.jobType,
            mode: PdfGenerationMode.GROUP,
            userId: userId,
            simulationType: dto.simulationType,
            data: {
                drivingSchoolId: code,
                studentIds: dto.studentIds,
                template: dto.template || 'simulation',
                data: [],
            },
        };

        await this.sendToQueue(request);

        return {
            jobId,
            jobType: dto.jobType,
            message: 'Group simulation job queued successfully',
            estimatedTime: dto.studentIds.length * 60,
        };
    }

    async queueSingleDireksiyonTakip(code: string, dto: GenerateSingleDireksiyonTakipDto): Promise<JobResponseDto> {
        // Validate job type
        if (!dto.jobType || dto.jobType !== JobType.SINGLE_DIREKSIYON_TAKIP) {
            throw new Error('Job type must be SINGLE_DIREKSIYON_TAKIP');
        }

        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;

        // Create job in database
        const result = await this.jobRepository.query(
            `INSERT INTO jobs (type, status, school_id, progress_percentage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
            [dto.jobType, JobStatus.PENDING, drivingSchool.id, 0]
        );

        const jobId = result.insertId.toString();

        const request: PdfGenerationRequest = {
            id: jobId,
            type: dto.jobType,
            mode: PdfGenerationMode.SINGLE,
            userId: userId,
            data: {
                drivingSchoolId: code,
                studentId: dto.studentId,
                template: dto.template || 'direksiyon_takip',
                data: {},
            },
        };

        await this.sendToQueue(request);

        return {
            jobId,
            jobType: dto.jobType,
            message: 'Single direksiyon takip job queued successfully',
            estimatedTime: 30,
        };
    }

    async queueGroupDireksiyonTakip(code: string, dto: GenerateGroupDireksiyonTakipDto): Promise<JobResponseDto> {
        // Validate job type
        if (!dto.jobType || dto.jobType !== JobType.GROUP_DIREKSIYON_TAKIP) {
            throw new Error('Job type must be GROUP_DIREKSIYON_TAKIP');
        }

        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;

        // Create job in database
        const result = await this.jobRepository.query(
            `INSERT INTO jobs (type, status, school_id, progress_percentage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
            [dto.jobType, JobStatus.PENDING, drivingSchool.id, 0]
        );

        const jobId = result.insertId.toString();

        const request: PdfGenerationRequest = {
            id: jobId,
            type: dto.jobType,
            mode: PdfGenerationMode.GROUP,
            userId: userId,
            data: {
                drivingSchoolId: code,
                studentIds: dto.studentIds,
                template: dto.template || 'direksiyon_takip',
                data: [],
            },
        };

        await this.sendToQueue(request);

        return {
            jobId,
            jobType: dto.jobType,
            message: 'Group direksiyon takip job queued successfully',
            estimatedTime: dto.studentIds.length * 30,
        };
    }

    private async sendToQueue(request: PdfGenerationRequest): Promise<void> {
        await this.rabbitMQService.sendMessage(this.queueName, request);
    }

    async handlePdfProgressUpdate(payload: {
        userId: number;
        tag: string;
        data: {
            jobId: string;
            progress: number;
            message: string;
            timestamp: string;
            pdfData?: string;
        };
    }) {
        const { userId, tag, data } = payload;
        const { jobId, progress, message, pdfData } = data;

        this.logger.log(`Received PDF progress update: ${jobId} - ${progress}% - ${message}`);

        try {
            // Parse jobId as integer
            const jobIdInt = parseInt(jobId);
            if (isNaN(jobIdInt)) {
                throw new Error(`Invalid jobId format: ${jobId}. Expected numeric value.`);
            }

            // Find existing job
            let job = await this.jobRepository.findOne({
                where: { id: jobIdInt }
            });

            if (!job) {
                throw new Error(`Job with id ${jobId} not found. Job should be created before processing.`);
            }

            // Update existing job
            const updateData: any = {
                status: progress === 100 ? JobStatus.COMPLETED : progress < 0 ? JobStatus.FAILED : JobStatus.PROCESSING,
                progress_percentage: Math.max(0, progress)
            };

            if (progress === 100) {
                updateData.completed_at = Math.floor(Date.now() / 1000);
            }

            await this.jobRepository.update(job.id, updateData);

            // Emit socket events based on progress
            if (progress === 100 && pdfData) {
                // PDF completed successfully
                this.logger.log(`PDF completed for job ${jobId}`);
                
                // Generate filename based on job type
                let filePrefix = 'certificate';
                if (job.type === 'single_direksiyon_takip' || job.type === 'group_direksiyon_takip') {
                    filePrefix = 'direksiyon';
                } else if (job.type === 'single_simulation' || job.type === 'group_simulation') {
                    filePrefix = 'simulasyon';
                }
                
                this.socketGateway.emitPdfCompleted(jobId, {
                    pdfData,
                    fileName: `${filePrefix}_${jobId}.pdf`,
                });
            } else if (progress < 0) {
                // PDF failed
                this.logger.error(`PDF failed for job ${jobId}: ${message}`);
                this.socketGateway.emitPdfError(jobId, message);
            } else {
                // Progress update
                this.socketGateway.emitPdfProgress(jobId, {
                    progress,
                    message,
                });
            }

            return { success: true, jobId };
        } catch (error) {
            this.logger.error(`Failed to handle PDF progress update for job ${jobId}`, error);
            throw error;
        }
    }
}
