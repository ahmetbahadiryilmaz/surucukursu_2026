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
exports.JobResponseDto = exports.GenerateGroupDireksiyonTakipDto = exports.GenerateSingleDireksiyonTakipDto = exports.GenerateGroupSimulationDto = exports.GenerateSingleSimulationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const shared_1 = require("../../../../../../../../shared/src");
class GenerateSingleSimulationDto {
}
exports.GenerateSingleSimulationDto = GenerateSingleSimulationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job type (must be SINGLE_SIMULATION)', enum: shared_1.JobType }),
    (0, class_validator_1.IsEnum)(shared_1.JobType),
    __metadata("design:type", String)
], GenerateSingleSimulationDto.prototype, "jobType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Student ID' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GenerateSingleSimulationDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Simulation type', enum: shared_1.SimulationType }),
    (0, class_validator_1.IsEnum)(shared_1.SimulationType),
    __metadata("design:type", String)
], GenerateSingleSimulationDto.prototype, "simulationType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template name', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateSingleSimulationDto.prototype, "template", void 0);
class GenerateGroupSimulationDto {
}
exports.GenerateGroupSimulationDto = GenerateGroupSimulationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job type (must be GROUP_SIMULATION)', enum: shared_1.JobType }),
    (0, class_validator_1.IsEnum)(shared_1.JobType),
    __metadata("design:type", String)
], GenerateGroupSimulationDto.prototype, "jobType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Array of student IDs' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    __metadata("design:type", Array)
], GenerateGroupSimulationDto.prototype, "studentIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Simulation type', enum: shared_1.SimulationType }),
    (0, class_validator_1.IsEnum)(shared_1.SimulationType),
    __metadata("design:type", String)
], GenerateGroupSimulationDto.prototype, "simulationType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template name', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateGroupSimulationDto.prototype, "template", void 0);
class GenerateSingleDireksiyonTakipDto {
}
exports.GenerateSingleDireksiyonTakipDto = GenerateSingleDireksiyonTakipDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job type (must be SINGLE_DIREKSIYON_TAKIP)', enum: shared_1.JobType }),
    (0, class_validator_1.IsEnum)(shared_1.JobType),
    __metadata("design:type", String)
], GenerateSingleDireksiyonTakipDto.prototype, "jobType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Student ID' }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], GenerateSingleDireksiyonTakipDto.prototype, "studentId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template name', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateSingleDireksiyonTakipDto.prototype, "template", void 0);
class GenerateGroupDireksiyonTakipDto {
}
exports.GenerateGroupDireksiyonTakipDto = GenerateGroupDireksiyonTakipDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job type (must be GROUP_DIREKSIYON_TAKIP)', enum: shared_1.JobType }),
    (0, class_validator_1.IsEnum)(shared_1.JobType),
    __metadata("design:type", String)
], GenerateGroupDireksiyonTakipDto.prototype, "jobType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Array of student IDs' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    __metadata("design:type", Array)
], GenerateGroupDireksiyonTakipDto.prototype, "studentIds", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Template name', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], GenerateGroupDireksiyonTakipDto.prototype, "template", void 0);
class JobResponseDto {
}
exports.JobResponseDto = JobResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique job ID for tracking' }),
    __metadata("design:type", String)
], JobResponseDto.prototype, "jobId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Job type' }),
    __metadata("design:type", String)
], JobResponseDto.prototype, "jobType", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Message indicating the request was queued' }),
    __metadata("design:type", String)
], JobResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Estimated processing time in seconds' }),
    __metadata("design:type", Number)
], JobResponseDto.prototype, "estimatedTime", void 0);
//# sourceMappingURL=simulation.dto.js.map