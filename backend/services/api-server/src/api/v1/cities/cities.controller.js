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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CitiesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const cities_service_1 = require("./cities.service");
let CitiesController = class CitiesController {
    constructor(citiesService) {
        this.citiesService = citiesService;
    }
    async getAllCities(includeDistricts) {
        return this.citiesService.findAll(includeDistricts);
    }
    async getCityById(id, includeDistricts) {
        return this.citiesService.findById(+id, includeDistricts);
    }
    async getAllDistricts() {
        return this.citiesService.findAllDistricts();
    }
    async getDistrictsByCity(id) {
        return this.citiesService.findDistrictsByCity(+id);
    }
};
exports.CitiesController = CitiesController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all cities' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all Turkish cities' }),
    (0, swagger_1.ApiQuery)({ name: 'includeDistricts', required: false, type: Boolean, description: 'Include districts in response' }),
    __param(0, (0, common_1.Query)('includeDistricts')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "getAllCities", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get city by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns city details' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'City not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'number', description: 'City ID' }),
    (0, swagger_1.ApiQuery)({ name: 'includeDistricts', required: false, type: Boolean, description: 'Include districts in response' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('includeDistricts')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "getCityById", null);
__decorate([
    (0, common_1.Get)('districts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all districts' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all districts' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "getAllDistricts", null);
__decorate([
    (0, common_1.Get)(':id/districts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get districts for a specific city' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns districts for the city' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'City not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', type: 'number', description: 'City ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CitiesController.prototype, "getDistrictsByCity", null);
exports.CitiesController = CitiesController = __decorate([
    (0, swagger_1.ApiTags)('Cities'),
    (0, common_1.Controller)('api/v1/cities'),
    __metadata("design:paramtypes", [cities_service_1.CitiesService])
], CitiesController);
//# sourceMappingURL=cities.controller.js.map