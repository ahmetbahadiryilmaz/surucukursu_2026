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
exports.PdfController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const pdf_service_1 = require("./pdf.service");
const driving_school_guard_1 = require("../../../../common/guards/driving-school.guard");
const pdf_dto_1 = require("../main/dto/pdf.dto");
const simulation_dto_1 = require("../main/dto/simulation.dto");
let PdfController = class PdfController {
    constructor(pdfService) {
        this.pdfService = pdfService;
    }
    async generateSinglePdf(code, dto) {
        return this.pdfService.queueSinglePdfGeneration(code, dto);
    }
    async generateGroupPdf(code, dto) {
        return this.pdfService.queueGroupPdfGeneration(code, dto);
    }
    async generateSingleSimulation(code, dto) {
        return this.pdfService.queueSingleSimulation(code, dto);
    }
    async generateGroupSimulation(code, dto) {
        return this.pdfService.queueGroupSimulation(code, dto);
    }
    async generateSingleDireksiyonTakip(code, dto) {
        return this.pdfService.queueSingleDireksiyonTakip(code, dto);
    }
    async generateGroupDireksiyonTakip(code, dto) {
        return this.pdfService.queueGroupDireksiyonTakip(code, dto);
    }
    async handlePdfProgress(code, payload) {
        console.log('🎯 PDF Progress endpoint called with:', JSON.stringify(payload, null, 2));
        return this.pdfService.handlePdfProgressUpdate(payload);
    }
};
exports.PdfController = PdfController;
__decorate([
    (0, common_1.Post)('generate/single'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate a single PDF certificate' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PDF generation queued successfully', type: pdf_dto_1.PdfGenerationResponseDto }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, pdf_dto_1.GenerateSinglePdfDto]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateSinglePdf", null);
__decorate([
    (0, common_1.Post)('generate/group'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate a group PDF certificates' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PDF generation queued successfully' }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateGroupPdf", null);
__decorate([
    (0, common_1.Post)('simulation/single'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate single simulation report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Simulation job queued successfully', type: simulation_dto_1.JobResponseDto }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, simulation_dto_1.GenerateSingleSimulationDto]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateSingleSimulation", null);
__decorate([
    (0, common_1.Post)('simulation/group'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate group simulation reports' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group simulation job queued successfully', type: simulation_dto_1.JobResponseDto }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, simulation_dto_1.GenerateGroupSimulationDto]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateGroupSimulation", null);
__decorate([
    (0, common_1.Post)('direksiyon-takip/single'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate single direksiyon takip report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Direksiyon takip job queued successfully', type: simulation_dto_1.JobResponseDto }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, simulation_dto_1.GenerateSingleDireksiyonTakipDto]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateSingleDireksiyonTakip", null);
__decorate([
    (0, common_1.Post)('direksiyon-takip/group'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate group direksiyon takip reports' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Group direksiyon takip job queued successfully', type: simulation_dto_1.JobResponseDto }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, simulation_dto_1.GenerateGroupDireksiyonTakipDto]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "generateGroupDireksiyonTakip", null);
__decorate([
    (0, common_1.Post)('progress'),
    (0, swagger_1.ApiOperation)({ summary: 'Handle PDF generation progress updates from workers' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Progress update processed successfully' }),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PdfController.prototype, "handlePdfProgress", null);
exports.PdfController = PdfController = __decorate([
    (0, swagger_1.ApiTags)('PDF Generation'),
    (0, common_1.Controller)('driving-school/:code/pdf'),
    (0, common_1.UseGuards)(driving_school_guard_1.DrivingSchoolGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [pdf_service_1.PdfService])
], PdfController);
//# sourceMappingURL=pdf.controller.js.map