"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDrivingSchoolOwnersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const admin_driving_school_owners_controller_1 = require("./admin-driving-school-owners.controller");
const admin_driving_school_owners_service_1 = require("./admin-driving-school-owners.service");
const jwt_1 = require("@nestjs/jwt");
const shared_1 = require("../../../../../../../shared/src");
const guards_module_1 = require("../../../../common/guards/guards.module");
let AdminDrivingSchoolOwnersModule = class AdminDrivingSchoolOwnersModule {
};
exports.AdminDrivingSchoolOwnersModule = AdminDrivingSchoolOwnersModule;
exports.AdminDrivingSchoolOwnersModule = AdminDrivingSchoolOwnersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([shared_1.DrivingSchoolOwnerEntity, shared_1.DrivingSchoolEntity, shared_1.DrivingSchoolManagerEntity, shared_1.SessionEntity]),
            jwt_1.JwtModule.register({
                secret: process.env.ENCRYPTION_KEY,
                signOptions: { expiresIn: '24h' },
            }),
            guards_module_1.GuardsModule,
        ],
        controllers: [admin_driving_school_owners_controller_1.AdminDrivingSchoolOwnersController],
        providers: [admin_driving_school_owners_service_1.AdminDrivingSchoolOwnersService]
    })
], AdminDrivingSchoolOwnersModule);
//# sourceMappingURL=admin-driving-school-owners.module.js.map