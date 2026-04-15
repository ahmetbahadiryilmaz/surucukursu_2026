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
exports.DrivingSchoolSettingsEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const driving_school_entity_1 = require("./driving-school.entity");
const notification_types_1 = require("../types/notification.types");
let DrivingSchoolSettingsEntity = class DrivingSchoolSettingsEntity extends base_entity_1.BaseEntity {
};
exports.DrivingSchoolSettingsEntity = DrivingSchoolSettingsEntity;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", Number)
], DrivingSchoolSettingsEntity.prototype, "driving_school_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolSettingsEntity.prototype, "simulator_type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: notification_types_1.NotificationPreferences.DEFAULT }),
    __metadata("design:type", Number)
], DrivingSchoolSettingsEntity.prototype, "notification_preferences", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => driving_school_entity_1.DrivingSchoolEntity, school => school.settings),
    (0, typeorm_1.JoinColumn)({ name: 'driving_school_id' }),
    __metadata("design:type", driving_school_entity_1.DrivingSchoolEntity)
], DrivingSchoolSettingsEntity.prototype, "driving_school", void 0);
exports.DrivingSchoolSettingsEntity = DrivingSchoolSettingsEntity = __decorate([
    (0, typeorm_1.Entity)('driving_school_settings')
], DrivingSchoolSettingsEntity);
