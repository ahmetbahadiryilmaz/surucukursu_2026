"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDashboardModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const guards_module_1 = require("../../../../common/guards/guards.module");
const shared_1 = require("../../../../../../../shared/src");
const dashboard_controller_1 = require("./dashboard.controller");
const dashboard_service_1 = require("./dashboard.service");
let AdminDashboardModule = class AdminDashboardModule {
};
exports.AdminDashboardModule = AdminDashboardModule;
exports.AdminDashboardModule = AdminDashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([shared_1.SessionEntity]),
            jwt_1.JwtModule.register({
                secret: process.env.ENCRYPTION_KEY,
                signOptions: { expiresIn: '24h' },
            }),
            guards_module_1.GuardsModule,
        ],
        controllers: [dashboard_controller_1.DashboardController],
        providers: [dashboard_service_1.DashboardService],
    })
], AdminDashboardModule);
//# sourceMappingURL=dashboard.module.js.map