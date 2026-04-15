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
exports.DrivingSchoolStudentEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const driving_school_entity_1 = require("./driving-school.entity");
let DrivingSchoolStudentEntity = class DrivingSchoolStudentEntity extends base_entity_1.BaseEntity {
};
exports.DrivingSchoolStudentEntity = DrivingSchoolStudentEntity;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "tc_number", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], DrivingSchoolStudentEntity.prototype, "school_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "donem", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "donem_text", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "license_class", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "mebbis_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "approval_status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "ilce_mem_approval", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "exam_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "criminal_record_check", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "practice_lessons", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "practice_rights", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolStudentEntity.prototype, "eexam_rights", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', unsigned: true, nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolStudentEntity.prototype, "last_synced_at", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => driving_school_entity_1.DrivingSchoolEntity, school => school.students),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", driving_school_entity_1.DrivingSchoolEntity)
], DrivingSchoolStudentEntity.prototype, "school", void 0);
exports.DrivingSchoolStudentEntity = DrivingSchoolStudentEntity = __decorate([
    (0, typeorm_1.Entity)('driving_school_students')
], DrivingSchoolStudentEntity);
