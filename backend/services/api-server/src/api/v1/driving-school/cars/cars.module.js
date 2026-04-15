"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const axios_1 = require("@nestjs/axios");
const cars_controller_1 = require("./cars.controller");
const cars_service_1 = require("./cars.service");
const shared_1 = require("../../../../../../../shared/src");
const mebbis_client_service_1 = require("../../../../common/clients/mebbis-client.service");
let CarsModule = class CarsModule {
};
exports.CarsModule = CarsModule;
exports.CarsModule = CarsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([shared_1.DrivingSchoolCarEntity, shared_1.DrivingSchoolEntity]),
            axios_1.HttpModule,
        ],
        controllers: [cars_controller_1.CarsController],
        providers: [cars_service_1.CarsService, mebbis_client_service_1.MebbisClientService],
        exports: [cars_service_1.CarsService],
    })
], CarsModule);
//# sourceMappingURL=cars.module.js.map