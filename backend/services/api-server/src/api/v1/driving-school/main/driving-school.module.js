"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MainModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
const driving_school_controller_1 = require("./driving-school.controller");
const driving_school_service_1 = require("./driving-school.service");
const shared_1 = require("../../../../../../../shared/src");
const mebbis_client_service_1 = require("../../../../common/clients/mebbis-client.service");
let MainModule = class MainModule {
};
exports.MainModule = MainModule;
exports.MainModule = MainModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            typeorm_1.TypeOrmModule.forFeature([shared_1.DrivingSchoolEntity, shared_1.DrivingSchoolSettingsEntity, shared_1.SessionEntity]),
        ],
        controllers: [driving_school_controller_1.DrivingSchoolController],
        providers: [driving_school_service_1.DrivingSchoolService, mebbis_client_service_1.MebbisClientService],
    })
], MainModule);
//# sourceMappingURL=driving-school.module.js.map