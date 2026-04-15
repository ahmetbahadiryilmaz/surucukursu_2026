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
exports.JobEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const driving_school_entity_1 = require("./driving-school.entity");
const job_types_1 = require("../types/job.types");
let JobEntity = class JobEntity extends base_entity_1.BaseEntity {
};
exports.JobEntity = JobEntity;
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: job_types_1.JobType,
        default: job_types_1.JobType.SINGLE_SIMULATION
    }),
    __metadata("design:type", String)
], JobEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: job_types_1.SimulationType,
        nullable: true
    }),
    __metadata("design:type", String)
], JobEntity.prototype, "simulation_type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: job_types_1.SyncCarsStage,
        nullable: true
    }),
    __metadata("design:type", String)
], JobEntity.prototype, "sync_stage", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: job_types_1.JobStatus,
        default: job_types_1.JobStatus.PENDING
    }),
    __metadata("design:type", String)
], JobEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], JobEntity.prototype, "progress_percentage", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], JobEntity.prototype, "error_message", void 0);
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
    (0, typeorm_1.Column)({ type: 'int', nullable: true }),
    __metadata("design:type", Number)
], JobEntity.prototype, "completed_at", void 0);
exports.JobEntity = JobEntity = __decorate([
    (0, typeorm_1.Entity)('jobs')
], JobEntity);
//# sourceMappingURL=job.entity.js.map