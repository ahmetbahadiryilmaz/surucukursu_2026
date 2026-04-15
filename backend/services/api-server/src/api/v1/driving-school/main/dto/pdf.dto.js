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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PdfGenerationResponseDto = exports.GenerateSinglePdfDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const shared_1 = require("../../../../../../../../shared/src");
class GenerateSinglePdfDto {
    constructor() {
        this.template = 'certificate';
    }
}
exports.GenerateSinglePdfDto = GenerateSinglePdfDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job type', enum: shared_1.JobType }),
    (0, class_validator_1.IsEnum)(shared_1.JobType),
    __metadata("design:type", String)
], GenerateSinglePdfDto.prototype, "jobType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Student ID' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GenerateSinglePdfDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template name', default: 'certificate' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateSinglePdfDto.prototype, "template", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Additional data for the PDF template' }),
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], GenerateSinglePdfDto.prototype, "data", void 0);
class PdfGenerationResponseDto {
}
exports.PdfGenerationResponseDto = PdfGenerationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique job ID for tracking' }),
    __metadata("design:type", String)
], PdfGenerationResponseDto.prototype, "jobId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Message indicating the request was queued' }),
    __metadata("design:type", String)
], PdfGenerationResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Estimated processing time in seconds' }),
    __metadata("design:type", Number)
], PdfGenerationResponseDto.prototype, "estimatedTime", void 0);
//# sourceMappingURL=pdf.dto.js.map