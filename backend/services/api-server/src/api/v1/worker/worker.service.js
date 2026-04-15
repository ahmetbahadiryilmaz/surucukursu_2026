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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerService = void 0;
const common_1 = require("@nestjs/common");
const socket_gateway_1 = require("../../../utils/socket/socket.gateway");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../shared/src");
let WorkerService = class WorkerService {
    constructor(socketGateway, jobRepository) {
        this.socketGateway = socketGateway;
        this.jobRepository = jobRepository;
    }
    async sendMessageToUser(userId, tag, data) {
        this.socketGateway.emitToUser(userId, tag, data);
        return { success: true };
    }
    async updateJob(jobId, progress, status, message) {
        const job = await this.jobRepository.findOne({ where: { id: parseInt(jobId) } });
        if (!job) {
            throw new Error(`Job with id ${jobId} not found`);
        }
        const updates = {
            progress_percentage: Math.max(0, Math.min(100, progress))
        };
        if (status) {
            updates.status = status === 'completed' ? shared_1.JobStatus.COMPLETED :
                status === 'failed' ? shared_1.JobStatus.FAILED :
                    status === 'processing' ? shared_1.JobStatus.PROCESSING : job.status;
        }
        else {
            updates.status = progress === 100 ? shared_1.JobStatus.COMPLETED :
                progress < 0 ? shared_1.JobStatus.FAILED :
                    shared_1.JobStatus.PROCESSING;
        }
        if (updates.status === shared_1.JobStatus.COMPLETED && !job.completed_at) {
            updates.completed_at = Math.floor(Date.now() / 1000);
        }
        if (updates.status === shared_1.JobStatus.FAILED && message) {
            updates.error_message = message;
        }
        await this.jobRepository.update(job.id, updates);
        this.socketGateway.emitToUser(job.school_id, 'job-update', {
            jobId: job.id.toString(),
            progress: updates.progress_percentage,
            status: updates.status,
            message: message || '',
            type: job.type,
            timestamp: new Date().toISOString()
        });
        return {
            success: true,
            job: {
                id: job.id,
                progress: updates.progress_percentage,
                status: updates.status
            }
        };
    }
};
exports.WorkerService = WorkerService;
exports.WorkerService = WorkerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => socket_gateway_1.SocketGateway))),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.JobEntity)),
    __metadata("design:paramtypes", [socket_gateway_1.SocketGateway,
        typeorm_2.Repository])
], WorkerService);
//# sourceMappingURL=worker.service.js.map