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
exports.DistrictEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const city_entity_1 = require("./city.entity");
let DistrictEntity = class DistrictEntity extends base_entity_1.BaseEntity {
};
exports.DistrictEntity = DistrictEntity;
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], DistrictEntity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], DistrictEntity.prototype, "city_id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => city_entity_1.CityEntity, city => city.districts),
    (0, typeorm_1.JoinColumn)({ name: 'city_id' }),
    __metadata("design:type", city_entity_1.CityEntity)
], DistrictEntity.prototype, "city", void 0);
exports.DistrictEntity = DistrictEntity = __decorate([
    (0, typeorm_1.Entity)('districts')
], DistrictEntity);
