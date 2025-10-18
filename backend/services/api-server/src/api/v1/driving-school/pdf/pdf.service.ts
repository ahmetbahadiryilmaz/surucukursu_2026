import { Injectable, NotFoundException, Inject, forwardRef, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolEntity, JobEntity, JobStatus, JobType } from '@surucukursu/shared';
import { GenerateSinglePdfDto, PdfGenerationResponseDto } from '../main/dto/pdf.dto';
import * as amqp from 'amqplib';
import { env } from '@surucukursu/shared';
import { PdfGenerationMode, PdfGenerationRequest } from '@surucukursu/shared';
import { SocketGateway } from '../../../../utils/socket/socket.gateway';

@Injectable()
export class PdfService implements OnModuleInit {
    private connection: any;
    private channel: any;
    private readonly queueName = env.rabbitmq.queueName;
    private readonly logger = new Logger(PdfService.name);

    constructor(
      @InjectRepository(DrivingSchoolEntity)
      private readonly drivingSchoolRepository: Repository<DrivingSchoolEntity>,
      @InjectRepository(JobEntity)
      private readonly jobRepository: Repository<JobEntity>,
      @Inject(forwardRef(() => SocketGateway))
      private socketGateway: SocketGateway,
    ) {}

    async onModuleInit() {
        await this.connectToRabbitMQ();
    }

    private async connectToRabbitMQ() {
        try {
            const { host, port, user, password } = env.rabbitmq;
            const connectionString = `amqp://${user}:${password}@${host}:${port}`;

            this.connection = await amqp.connect(connectionString);
            this.channel = await this.connection.createChannel();

            // Ensure queue exists
            await this.channel.assertQueue(this.queueName, { durable: true });
        } catch (error) {
            console.error('Failed to connect to RabbitMQ:', error);
            throw error;
        }
    }

    async queueSinglePdfGeneration(code: string, dto: GenerateSinglePdfDto): Promise<PdfGenerationResponseDto> {
        // Get driving school info to get the owner/manager user ID
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;

        // Create job in database first to get auto-generated ID
        // Use raw SQL to insert with payload field that the DB schema expects
        const result = await this.jobRepository.query(
            `INSERT INTO jobs (type, status, school_id, progress_percentage, payload, created_at, updated_at) 
             VALUES (?, ?, ?, ?, '{}', UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
            [JobType.PDF_GENERATION, JobStatus.PENDING, drivingSchool.id, 0]
        );

        const jobId = result.insertId.toString();

        const request: PdfGenerationRequest = {
            id: jobId,
            mode: PdfGenerationMode.SINGLE,
            userId: userId,
            data: {
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

    async queueGroupPdfGeneration(code: string, dto: { studentIds: number[]; template?: string; data?: any[] }) {
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
        // Use raw SQL to insert with payload field that the DB schema expects
        const result = await this.jobRepository.query(
            `INSERT INTO jobs (type, status, school_id, progress_percentage, payload, created_at, updated_at) 
             VALUES (?, ?, ?, ?, '{}', UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`,
            [JobType.PDF_GENERATION, JobStatus.PENDING, drivingSchool.id, 0]
        );

        const jobId = result.insertId.toString();

        const request: PdfGenerationRequest = {
            id: jobId,
            mode: PdfGenerationMode.GROUP,
            userId: userId,
            data: {
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

    private async sendToQueue(request: PdfGenerationRequest): Promise<void> {
        if (!this.channel) {
            throw new Error('RabbitMQ channel not available');
        }

        const message = JSON.stringify(request);
        await this.channel.sendToQueue(this.queueName, Buffer.from(message), {
            persistent: true,
        });
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
                this.socketGateway.emitPdfCompleted(jobId, {
                    pdfData,
                    fileName: `certificate_${jobId}.pdf`,
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