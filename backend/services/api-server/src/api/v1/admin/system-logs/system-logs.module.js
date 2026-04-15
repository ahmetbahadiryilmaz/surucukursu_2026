"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemLogsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const system_logs_controller_1 = require("./system-logs.controller");
const system_logs_service_1 = require("./system-logs.service");
const jwt_1 = require("@nestjs/jwt");
const shared_1 = require("../../../../../../../shared/src");
const guards_module_1 = require("../../../../common/guards/guards.module");
let SystemLogsModule = class SystemLogsModule {
};
exports.SystemLogsModule = SystemLogsModule;
exports.SystemLogsModule = SystemLogsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([shared_1.SystemLogsEntity, shared_1.SessionEntity]),
            jwt_1.JwtModule.register({
                secret: process.env.ENCRYPTION_KEY,
                signOptions: { expiresIn: '24h' },
            }),
            guards_module_1.GuardsModule,
        ],
        controllers: [system_logs_controller_1.SystemLogsController],
        providers: [system_logs_service_1.SystemLogsService]
    })
], SystemLogsModule);
//# sourceMappingURL=system-logs.module.js.map