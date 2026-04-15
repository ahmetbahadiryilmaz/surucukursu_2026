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
exports.WorkerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const worker_service_1 = require("./worker.service");
const local_only_guard_1 = require("../../../common/guards/local-only.guard");
const public_decorator_1 = require("../../../common/decorators/public.decorator");
let WorkerController = class WorkerController {
    constructor(workerService) {
        this.workerService = workerService;
    }
    async sendToUser(messageData, req) {
        return await this.workerService.sendMessageToUser(messageData.userId, messageData.tag, messageData.data);
    }
    async updateJob(jobData, req) {
        return await this.workerService.updateJob(jobData.jobId, jobData.progress, jobData.status, jobData.message);
    }
};
exports.WorkerController = WorkerController;
__decorate([
    (0, common_1.Post)('sendtouser'),
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(local_only_guard_1.LocalOnlyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Send message to specific user via Socket.IO' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Message sent successfully' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkerController.prototype, "sendToUser", null);
__decorate([
    (0, common_1.Post)('update-job'),
    (0, public_decorator_1.Public)(),
    (0, common_1.UseGuards)(local_only_guard_1.LocalOnlyGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Update job status and progress' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Job updated successfully' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WorkerController.prototype, "updateJob", null);
exports.WorkerController = WorkerController = __decorate([
    (0, swagger_1.ApiTags)('Worker'),
    (0, common_1.Controller)('worker'),
    __metadata("design:paramtypes", [worker_service_1.WorkerService])
], WorkerController);
//# sourceMappingURL=worker.controller.js.map