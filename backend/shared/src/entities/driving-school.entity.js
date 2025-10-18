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
exports.DrivingSchoolEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const driving_school_student_entity_1 = require("./driving-school-student.entity");
const driving_school_car_entity_1 = require("./driving-school-car.entity");
const driving_school_manager_entity_1 = require("./driving-school-manager.entity");
const driving_school_owner_entity_1 = require("./driving-school-owner.entity");
const city_entity_1 = require("./city.entity");
const district_entity_1 = require("./district.entity");
const subscription_entity_1 = require("./subscription.entity");
let DrivingSchoolEntity = class DrivingSchoolEntity extends base_entity_1.BaseEntity {
};
exports.DrivingSchoolEntity = DrivingSchoolEntity;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DrivingSchoolEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DrivingSchoolEntity.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DrivingSchoolEntity.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolEntity.prototype, "mebbis_username", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolEntity.prototype, "mebbis_password", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], DrivingSchoolEntity.prototype, "manager_id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], DrivingSchoolEntity.prototype, "owner_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolEntity.prototype, "city_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolEntity.prototype, "district_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolEntity.prototype, "created_by", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => driving_school_student_entity_1.DrivingSchoolStudentEntity, student => student.school),
    __metadata("design:type", Array)
], DrivingSchoolEntity.prototype, "students", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => driving_school_car_entity_1.DrivingSchoolCarEntity, car => car.school),
    __metadata("design:type", Array)
], DrivingSchoolEntity.prototype, "cars", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => driving_school_manager_entity_1.DrivingSchoolManagerEntity, manager => manager.schools),
    (0, typeorm_1.JoinColumn)({ name: 'manager_id' }),
    __metadata("design:type", driving_school_manager_entity_1.DrivingSchoolManagerEntity)
], DrivingSchoolEntity.prototype, "manager", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => driving_school_owner_entity_1.DrivingSchoolOwnerEntity, owner => owner.DrivingSchool),
    (0, typeorm_1.JoinColumn)({ name: 'owner_id' }),
    __metadata("design:type", driving_school_owner_entity_1.DrivingSchoolOwnerEntity)
], DrivingSchoolEntity.prototype, "owner", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => city_entity_1.CityEntity, city => city.districts),
    (0, typeorm_1.JoinColumn)({ name: 'city_id' }),
    __metadata("design:type", city_entity_1.CityEntity)
], DrivingSchoolEntity.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => district_entity_1.DistrictEntity),
    (0, typeorm_1.JoinColumn)({ name: 'district_id' }),
    __metadata("design:type", district_entity_1.DistrictEntity)
], DrivingSchoolEntity.prototype, "district", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => subscription_entity_1.SubscriptionEntity, subscription => subscription.driving_school_id),
    __metadata("design:type", subscription_entity_1.SubscriptionEntity)
], DrivingSchoolEntity.prototype, "subscription", void 0);
exports.DrivingSchoolEntity = DrivingSchoolEntity = __decorate([
    (0, typeorm_1.Entity)('driving_schools')
], DrivingSchoolEntity);
