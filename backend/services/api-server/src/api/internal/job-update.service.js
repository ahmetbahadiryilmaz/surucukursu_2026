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
var JobUpdateService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobUpdateService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../shared/src");
const shared_2 = require("../../../../../shared/src");
const socket_gateway_1 = require("../../utils/socket/socket.gateway");
let JobUpdateService = JobUpdateService_1 = class JobUpdateService {
    constructor(jobRepository, socketGateway) {
        this.jobRepository = jobRepository;
        this.socketGateway = socketGateway;
        this.logger = new common_1.Logger(JobUpdateService_1.name);
    }
    async handleJobUpdate(payload) {
        const { jobId, status, progress, message, result, errorMessage } = payload;
        try {
            const updateData = {
                status: status,
                progress_percentage: progress,
                updated_at: Math.floor(Date.now() / 1000)
            };
            if (result) {
                if (result.filePath)
                    updateData.file_path = result.filePath;
                if (result.fileUrl)
                    updateData.file_url = result.fileUrl;
                if (result.completedAt)
                    updateData.completed_at = result.completedAt;
                updateData.result = result;
            }
            if (errorMessage) {
                updateData.error_message = errorMessage;
            }
            await this.jobRepository.update(jobId, updateData);
            const updatedJob = await this.jobRepository.findOne({ where: { id: jobId } });
            if (updatedJob) {
                this.socketGateway.emitToUser(updatedJob.school_id, 'job-update', {
                    jobId: updatedJob.id.toString(),
                    progress: progress,
                    status: status,
                    message: message || '',
                    type: updatedJob.type,
                    timestamp: new Date().toISOString()
                });
            }
            this.logger.log(`Job ${jobId} updated: ${status} (${progress}%)`);
            shared_2.appLogger.business(`Job progress update: ${jobId} - ${status} - ${progress}%`, {
                message,
                hasResult: !!result,
                hasError: !!errorMessage
            });
            return { success: true, jobId };
        }
        catch (error) {
            this.logger.error(`Failed to update job ${jobId}`, error);
            shared_2.appLogger.error('Job update failed', { jobId, error: error.message });
            throw error;
        }
    }
};
exports.JobUpdateService = JobUpdateService;
exports.JobUpdateService = JobUpdateService = JobUpdateService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.JobEntity)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => socket_gateway_1.SocketGateway))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        socket_gateway_1.SocketGateway])
], JobUpdateService);
//# sourceMappingURL=job-update.service.js.map