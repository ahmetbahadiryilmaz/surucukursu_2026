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
exports.SubscriptionEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const driving_school_entity_1 = require("./driving-school.entity");
const dateTransformer = {
    to: (value) => new Date(value * 1000),
    from: (value) => Math.floor(value.getTime() / 1000),
};
let SubscriptionEntity = class SubscriptionEntity extends base_entity_1.BaseEntity {
};
exports.SubscriptionEntity = SubscriptionEntity;
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", Number)
], SubscriptionEntity.prototype, "driving_school_id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'demo' }),
    __metadata("design:type", String)
], SubscriptionEntity.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], SubscriptionEntity.prototype, "pdf_print_limit", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], SubscriptionEntity.prototype, "pdf_print_used", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, transformer: dateTransformer }),
    __metadata("design:type", Number)
], SubscriptionEntity.prototype, "ends_at", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => driving_school_entity_1.DrivingSchoolEntity),
    (0, typeorm_1.JoinColumn)({ name: 'driving_school_id' }),
    __metadata("design:type", driving_school_entity_1.DrivingSchoolEntity)
], SubscriptionEntity.prototype, "driving_school", void 0);
exports.SubscriptionEntity = SubscriptionEntity = __decorate([
    (0, typeorm_1.Entity)('subscriptions')
], SubscriptionEntity);
