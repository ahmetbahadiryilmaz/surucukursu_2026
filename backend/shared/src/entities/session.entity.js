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
exports.SessionEntity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const dateTransformer = {
    to: (value) => new Date(value * 1000),
    from: (value) => Math.floor(value.getTime() / 1000),
};
let SessionEntity = class SessionEntity extends base_entity_1.BaseEntity {
};
exports.SessionEntity = SessionEntity;
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 512 }),
    __metadata("design:type", String)
], SessionEntity.prototype, "token", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', transformer: dateTransformer }),
    __metadata("design:type", Number)
], SessionEntity.prototype, "expires_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', transformer: dateTransformer }),
    __metadata("design:type", Number)
], SessionEntity.prototype, "last_activity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', transformer: dateTransformer }),
    __metadata("design:type", Number)
], SessionEntity.prototype, "last_login", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Number)
], SessionEntity.prototype, "user_type", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], SessionEntity.prototype, "user_id", void 0);
exports.SessionEntity = SessionEntity = __decorate([
    (0, typeorm_1.Entity)('sessions')
], SessionEntity);
