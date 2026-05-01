"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const slack_module_1 = require("../../../utils/slack/slack.module");
const shared_1 = require("../../../../../../shared/src");
const guards_module_1 = require("../../../common/guards/guards.module");
const shared_2 = require("../../../../../../shared/src");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                shared_1.AdminEntity,
                shared_1.DrivingSchoolOwnerEntity,
                shared_1.DrivingSchoolManagerEntity,
                shared_1.SessionEntity,
                shared_1.SystemLogsEntity,
                shared_1.DrivingSchoolEntity,
            ]),
            jwt_1.JwtModule.register({
                secret: shared_2.env.jwt.secret,
                signOptions: { expiresIn: '24h' },
            }),
            slack_module_1.SlackModule,
            guards_module_1.GuardsModule,
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map