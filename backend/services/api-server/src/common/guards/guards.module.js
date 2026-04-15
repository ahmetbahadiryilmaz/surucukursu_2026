"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuardsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const shared_1 = require("../../../../../shared/src");
const auth_guard_1 = require("./auth.guard");
const admin_guard_1 = require("./admin.guard");
const driving_school_guard_1 = require("./driving-school.guard");
let GuardsModule = class GuardsModule {
};
exports.GuardsModule = GuardsModule;
exports.GuardsModule = GuardsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([shared_1.SessionEntity, shared_1.DrivingSchoolEntity]),
        ],
        providers: [auth_guard_1.AuthGuard, admin_guard_1.AdminGuard, driving_school_guard_1.DrivingSchoolGuard],
        exports: [
            auth_guard_1.AuthGuard,
            admin_guard_1.AdminGuard,
            driving_school_guard_1.DrivingSchoolGuard,
            typeorm_1.TypeOrmModule
        ]
    })
], GuardsModule);
//# sourceMappingURL=guards.module.js.map