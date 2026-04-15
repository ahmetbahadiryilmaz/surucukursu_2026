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
exports.DrivingSchoolManagerEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const driving_school_entity_1 = require("./driving-school.entity");
let DrivingSchoolManagerEntity = class DrivingSchoolManagerEntity extends base_entity_1.BaseEntity {
};
exports.DrivingSchoolManagerEntity = DrivingSchoolManagerEntity;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DrivingSchoolManagerEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], DrivingSchoolManagerEntity.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DrivingSchoolManagerEntity.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DrivingSchoolManagerEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => driving_school_entity_1.DrivingSchoolEntity, school => school.manager),
    __metadata("design:type", Array)
], DrivingSchoolManagerEntity.prototype, "schools", void 0);
exports.DrivingSchoolManagerEntity = DrivingSchoolManagerEntity = __decorate([
    (0, typeorm_1.Entity)('driving_school_managers')
], DrivingSchoolManagerEntity);
