"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PdfService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
const shared_2 = require("../../../../../../../shared/src");
const shared_3 = require("../../../../../../../shared/src");
const socket_gateway_1 = require("../../../../utils/socket/socket.gateway");
const rabbitmq_1 = require("../../../../utils/rabbitmq");
let PdfService = PdfService_1 = class PdfService {
    constructor(drivingSchoolRepository, jobRepository, socketGateway, rabbitMQService) {
        this.drivingSchoolRepository = drivingSchoolRepository;
        this.jobRepository = jobRepository;
        this.socketGateway = socketGateway;
        this.rabbitMQService = rabbitMQService;
        this.queueName = shared_2.env.rabbitmq.queueName;
        this.logger = new common_1.Logger(PdfService_1.name);
    }
    async queueSinglePdfGeneration(code, dto) {
        if (!dto.jobType) {
            throw new Error('Job type is required');
        }
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;
        const result = await this.jobRepository.query(`INSERT INTO jobs (type, status, school_id, progress_percentage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`, [dto.jobType, shared_1.JobStatus.PENDING, drivingSchool.id, 0]);
        const jobId = result.insertId.toString();
        const request = {
            id: jobId,
            type: dto.jobType,
            mode: shared_3.PdfGenerationMode.SINGLE,
            userId: userId,
            data: {
                drivingSchoolId: code,
                studentId: dto.studentId,
                template: dto.template || 'certificate',
                data: dto.data || {},
            },
        };
        await this.sendToQueue(request);
        return {
            jobId,
            message: 'PDF generation request queued successfully',
            estimatedTime: 30,
        };
    }
    async queueGroupPdfGeneration(code, dto) {
        if (!dto.jobType) {
            throw new Error('Job type is required');
        }
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        const userId = 1;
        const result = await this.jobRepository.query(`INSERT INTO jobs (type, status, school_id, progress_percentage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`, [dto.jobType, shared_1.JobStatus.PENDING, drivingSchool.id, 0]);
        const jobId = result.insertId.toString();
        const request = {
            id: jobId,
            type: dto.jobType,
            mode: shared_3.PdfGenerationMode.GROUP,
            userId: userId,
            data: {
                drivingSchoolId: code,
                studentIds: dto.studentIds,
                template: dto.template || 'certificate',
                data: dto.data || [],
            },
        };
        await this.sendToQueue(request);
        return {
            jobId,
            message: 'Group PDF generation request queued successfully',
            estimatedTime: dto.studentIds.length * 30,
        };
    }
    async queueSingleSimulation(code, dto) {
        if (!dto.jobType || dto.jobType !== shared_1.JobType.SINGLE_SIMULATION) {
            throw new Error('Job type must be SINGLE_SIMULATION');
        }
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;
        const result = await this.jobRepository.query(`INSERT INTO jobs (type, status, school_id, progress_percentage, simulation_type, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`, [dto.jobType, shared_1.JobStatus.PENDING, drivingSchool.id, 0, dto.simulationType]);
        const jobId = result.insertId.toString();
        const request = {
            id: jobId,
            type: dto.jobType,
            mode: shared_3.PdfGenerationMode.SINGLE,
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
    async queueGroupSimulation(code, dto) {
        if (!dto.jobType || dto.jobType !== shared_1.JobType.GROUP_SIMULATION) {
            throw new Error('Job type must be GROUP_SIMULATION');
        }
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;
        const result = await this.jobRepository.query(`INSERT INTO jobs (type, status, school_id, progress_percentage, simulation_type, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`, [dto.jobType, shared_1.JobStatus.PENDING, drivingSchool.id, 0, dto.simulationType]);
        const jobId = result.insertId.toString();
        const request = {
            id: jobId,
            type: dto.jobType,
            mode: shared_3.PdfGenerationMode.GROUP,
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
    async queueSingleDireksiyonTakip(code, dto) {
        if (!dto.jobType || dto.jobType !== shared_1.JobType.SINGLE_DIREKSIYON_TAKIP) {
            throw new Error('Job type must be SINGLE_DIREKSIYON_TAKIP');
        }
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;
        const result = await this.jobRepository.query(`INSERT INTO jobs (type, status, school_id, progress_percentage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`, [dto.jobType, shared_1.JobStatus.PENDING, drivingSchool.id, 0]);
        const jobId = result.insertId.toString();
        const request = {
            id: jobId,
            type: dto.jobType,
            mode: shared_3.PdfGenerationMode.SINGLE,
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
    async queueGroupDireksiyonTakip(code, dto) {
        if (!dto.jobType || dto.jobType !== shared_1.JobType.GROUP_DIREKSIYON_TAKIP) {
            throw new Error('Job type must be GROUP_DIREKSIYON_TAKIP');
        }
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        const userId = drivingSchool.owner_id || drivingSchool.manager_id || 1;
        const result = await this.jobRepository.query(`INSERT INTO jobs (type, status, school_id, progress_percentage, created_at, updated_at) 
             VALUES (?, ?, ?, ?, UNIX_TIMESTAMP(), UNIX_TIMESTAMP())`, [dto.jobType, shared_1.JobStatus.PENDING, drivingSchool.id, 0]);
        const jobId = result.insertId.toString();
        const request = {
            id: jobId,
            type: dto.jobType,
            mode: shared_3.PdfGenerationMode.GROUP,
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
    async sendToQueue(request) {
        await this.rabbitMQService.sendMessage(this.queueName, request);
    }
    async handlePdfProgressUpdate(payload) {
        const { userId, tag, data } = payload;
        const { jobId, progress, message, pdfData } = data;
        this.logger.log(`Received PDF progress update: ${jobId} - ${progress}% - ${message}`);
        try {
            const jobIdInt = parseInt(jobId);
            if (isNaN(jobIdInt)) {
                throw new Error(`Invalid jobId format: ${jobId}. Expected numeric value.`);
            }
            let job = await this.jobRepository.findOne({
                where: { id: jobIdInt }
            });
            if (!job) {
                throw new Error(`Job with id ${jobId} not found. Job should be created before processing.`);
            }
            const updateData = {
                status: progress === 100 ? shared_1.JobStatus.COMPLETED : progress < 0 ? shared_1.JobStatus.FAILED : shared_1.JobStatus.PROCESSING,
                progress_percentage: Math.max(0, progress)
            };
            if (progress === 100) {
                updateData.completed_at = Math.floor(Date.now() / 1000);
            }
            await this.jobRepository.update(job.id, updateData);
            if (progress === 100 && pdfData) {
                this.logger.log(`PDF completed for job ${jobId}`);
                let filePrefix = 'certificate';
                if (job.type === 'single_direksiyon_takip' || job.type === 'group_direksiyon_takip') {
                    filePrefix = 'direksiyon';
                }
                else if (job.type === 'single_simulation' || job.type === 'group_simulation') {
                    filePrefix = 'simulasyon';
                }
                this.socketGateway.emitPdfCompleted(jobId, {
                    pdfData,
                    fileName: `${filePrefix}_${jobId}.pdf`,
                });
            }
            else if (progress < 0) {
                this.logger.error(`PDF failed for job ${jobId}: ${message}`);
                this.socketGateway.emitPdfError(jobId, message);
            }
            else {
                this.socketGateway.emitPdfProgress(jobId, {
                    progress,
                    message,
                });
            }
            return { success: true, jobId };
        }
        catch (error) {
            this.logger.error(`Failed to handle PDF progress update for job ${jobId}`, error);
            throw error;
        }
    }
};
exports.PdfService = PdfService;
exports.PdfService = PdfService = PdfService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.JobEntity)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => socket_gateway_1.SocketGateway))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        socket_gateway_1.SocketGateway,
        rabbitmq_1.RabbitMQService])
], PdfService);
//# sourceMappingURL=pdf.service.js.map