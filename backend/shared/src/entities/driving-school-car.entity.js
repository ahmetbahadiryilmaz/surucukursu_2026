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
exports.DrivingSchoolCarEntity = exports.CarType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const driving_school_entity_1 = require("./driving-school.entity");
var CarType;
(function (CarType) {
    CarType["REGULAR_CAR"] = "regular_car";
    CarType["SIMULATOR"] = "simulator";
})(CarType || (exports.CarType = CarType = {}));
let DrivingSchoolCarEntity = class DrivingSchoolCarEntity extends base_entity_1.BaseEntity {
};
exports.DrivingSchoolCarEntity = DrivingSchoolCarEntity;
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: CarType, default: CarType.REGULAR_CAR }),
    __metadata("design:type", String)
], DrivingSchoolCarEntity.prototype, "car_type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DrivingSchoolCarEntity.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolCarEntity.prototype, "brand", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true }),
    __metadata("design:type", String)
], DrivingSchoolCarEntity.prototype, "plate_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolCarEntity.prototype, "year", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], DrivingSchoolCarEntity.prototype, "purchase_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], DrivingSchoolCarEntity.prototype, "last_inspection_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], DrivingSchoolCarEntity.prototype, "inspection_validity_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolCarEntity.prototype, "driver_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolCarEntity.prototype, "lesson_count", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolCarEntity.prototype, "excuse_days", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true }),
    __metadata("design:type", String)
], DrivingSchoolCarEntity.prototype, "serial_number", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], DrivingSchoolCarEntity.prototype, "start_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], DrivingSchoolCarEntity.prototype, "last_maintenance_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], DrivingSchoolCarEntity.prototype, "usage_hours", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], DrivingSchoolCarEntity.prototype, "license_validity_date", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], DrivingSchoolCarEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], DrivingSchoolCarEntity.prototype, "school_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => driving_school_entity_1.DrivingSchoolEntity, school => school.cars),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", driving_school_entity_1.DrivingSchoolEntity)
], DrivingSchoolCarEntity.prototype, "school", void 0);
exports.DrivingSchoolCarEntity = DrivingSchoolCarEntity = __decorate([
    (0, typeorm_1.Entity)('driving_school_cars')
], DrivingSchoolCarEntity);
