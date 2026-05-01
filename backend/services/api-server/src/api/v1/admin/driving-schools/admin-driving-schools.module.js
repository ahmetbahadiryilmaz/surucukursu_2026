"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDrivingSchoolsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_driving_schools_controller_1 = require("./admin-driving-schools.controller");
const admin_driving_schools_service_1 = require("./admin-driving-schools.service");
const jwt_1 = require("@nestjs/jwt");
const shared_1 = require("../../../../../../../shared/src");
const guards_module_1 = require("../../../../common/guards/guards.module");
let AdminDrivingSchoolsModule = class AdminDrivingSchoolsModule {
};
exports.AdminDrivingSchoolsModule = AdminDrivingSchoolsModule;
exports.AdminDrivingSchoolsModule = AdminDrivingSchoolsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([shared_1.DrivingSchoolEntity, shared_1.SubscriptionEntity, shared_1.SystemLogsEntity, shared_1.SessionEntity, shared_1.DrivingSchoolStudentEntity, shared_1.DrivingSchoolCarEntity]),
            jwt_1.JwtModule.register({
                secret: process.env.ENCRYPTION_KEY,
                signOptions: { expiresIn: '24h' },
            }),
            guards_module_1.GuardsModule,
        ],
        controllers: [admin_driving_schools_controller_1.AdminDrivingSchoolsController],
        providers: [admin_driving_schools_service_1.AdminDrivingSchoolsService]
    })
], AdminDrivingSchoolsModule);
//# sourceMappingURL=admin-driving-schools.module.js.map