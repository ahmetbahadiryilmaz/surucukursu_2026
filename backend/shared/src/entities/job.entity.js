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
exports.JobEntity = exports.JobType = exports.JobStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const driving_school_entity_1 = require("./driving-school.entity");
var JobStatus;
(function (JobStatus) {
    JobStatus["PENDING"] = "pending";
    JobStatus["PROCESSING"] = "processing";
    JobStatus["COMPLETED"] = "completed";
    JobStatus["FAILED"] = "failed";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var JobType;
(function (JobType) {
    JobType["PDF_GENERATION"] = "pdf_generation";
})(JobType || (exports.JobType = JobType = {}));
let JobEntity = class JobEntity extends base_entity_1.BaseEntity {
};
exports.JobEntity = JobEntity;
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: JobType,
        default: JobType.PDF_GENERATION
    }),
    __metadata("design:type", String)
], JobEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: JobStatus,
        default: JobStatus.PENDING
    }),
    __metadata("design:type", String)
], JobEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('json'),
    __metadata("design:type", Object)
], JobEntity.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], JobEntity.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JobEntity.prototype, "error_message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], JobEntity.prototype, "progress_percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JobEntity.prototype, "file_path", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JobEntity.prototype, "file_url", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], JobEntity.prototype, "school_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => driving_school_entity_1.DrivingSchoolEntity),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", driving_school_entity_1.DrivingSchoolEntity)
], JobEntity.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], JobEntity.prototype, "started_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], JobEntity.prototype, "completed_at", void 0);
exports.JobEntity = JobEntity = __decorate([
    (0, typeorm_1.Entity)('jobs')
], JobEntity);
