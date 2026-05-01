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
var MebbisClientService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MebbisClientService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let MebbisClientService = MebbisClientService_1 = class MebbisClientService {
    constructor(httpService) {
        this.httpService = httpService;
        this.logger = new common_1.Logger(MebbisClientService_1.name);
        this.mebbisServiceUrl = `http://localhost:${process.env.MEBBIS_SERVICE_PORT || '9010'}`;
    }
    async validateCredentials(username, password, drivingSchoolId) {
        var _a, _b, _c, _d;
        try {
            const url = `${this.mebbisServiceUrl}/api/mebbis/login/trylogin`;
            this.logger.log(`[START] Making request to MEBBIS service: ${url}`);
            this.logger.debug(`Request body: { username: ${username}, password: ***, drivingSchoolId: ${drivingSchoolId || 0} }`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                username,
                password,
                drivingSchoolId: drivingSchoolId || 0,
            }, {
                timeout: 30000,
            }));
            this.logger.log(`[RESPONSE] Received response from MEBBIS service:`, JSON.stringify(response.data));
            if (response.data && response.data.message === 'login success') {
                this.logger.log(`[SUCCESS] Credentials validated successfully for user: ${username}`);
                return {
                    success: true,
                    message: 'Credentials are valid',
                };
            }
            else {
                this.logger.warn(`[FAILED] Credentials validation failed for user: ${username}`);
                const errorMessage = ((_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.message) || ((_c = response.data) === null || _c === void 0 ? void 0 : _c.message) || 'Invalid username or password';
                return {
                    success: false,
                    message: errorMessage,
                };
            }
        }
        catch (error) {
            this.logger.error(`[ERROR] Error validating credentials for user: ${username}`, error === null || error === void 0 ? void 0 : error.message);
            this.logger.error(`Error details:`, error);
            if (((_d = error.response) === null || _d === void 0 ? void 0 : _d.status) === 401) {
                return {
                    success: false,
                    message: 'Invalid username or password',
                };
            }
            if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                this.logger.error(`MEBBIS service at ${this.mebbisServiceUrl} is not reachable (${error.code})`);
                throw new common_1.HttpException('MEBBIS service is temporarily unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw new common_1.HttpException('Error validating credentials with MEBBIS service', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async syncVehicles(drivingSchoolId, username, password, ajandasKodu) {
        var _a, _b;
        try {
            const url = `${this.mebbisServiceUrl}/api/mebbis/vehicles/sync`;
            this.logger.log(`[START] Syncing vehicles from MEBBIS service: ${url}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                drivingSchoolId,
                username,
                password,
                ajandasKodu,
            }, {
                timeout: 60000,
            }));
            this.logger.log(`[SUCCESS] Vehicles synced successfully`);
            this.logger.debug(`Vehicles: ${response.data.vehicles.length}, Simulators: ${response.data.simulators.length}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`[ERROR] Error syncing vehicles`, error === null || error === void 0 ? void 0 : error.message);
            this.logger.error(`Error details:`, error);
            if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                this.logger.error(`MEBBIS service at ${this.mebbisServiceUrl} is not reachable (${error.code})`);
                throw new common_1.HttpException('MEBBIS service is temporarily unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw new common_1.HttpException(((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || { message: 'Error syncing vehicles from MEBBIS service' }, ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async fetchVehiclesAndSimulators(cookieString, initialPageBody, session, username, password, ajandasKodu) {
        var _a, _b;
        try {
            const url = `${this.mebbisServiceUrl}/api/mebbis/vehicles/fetch`;
            this.logger.log(`[START] Fetching vehicles and simulators from MEBBIS service: ${url}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                cookieString,
                initialPageBody,
                session,
                username,
                password,
                ajandasKodu,
            }, {
                timeout: 60000,
            }));
            this.logger.log(`[SUCCESS] Vehicles and simulators fetched successfully`);
            this.logger.debug(`Vehicles: ${response.data.vehicles.length}, Simulators: ${response.data.simulators.length}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`[ERROR] Error fetching vehicles and simulators`, error === null || error === void 0 ? void 0 : error.message);
            this.logger.error(`Error details:`, error);
            if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                this.logger.error(`MEBBIS service at ${this.mebbisServiceUrl} is not reachable (${error.code})`);
                throw new common_1.HttpException('MEBBIS service is temporarily unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw new common_1.HttpException(((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || { message: 'Error fetching vehicles and simulators from MEBBIS service' }, ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async syncStudents(drivingSchoolId, username, password) {
        var _a, _b;
        try {
            const url = `${this.mebbisServiceUrl}/api/mebbis/students/sync`;
            this.logger.log(`[START] Syncing students from MEBBIS service: ${url}`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(url, {
                drivingSchoolId,
                username,
                password,
            }, {
                timeout: 300000,
            }));
            this.logger.log(`[SUCCESS] Students synced successfully`);
            this.logger.debug(`Students: ${response.data.students.length}`);
            return response.data;
        }
        catch (error) {
            this.logger.error(`[ERROR] Error syncing students`, error === null || error === void 0 ? void 0 : error.message);
            this.logger.error(`Error details:`, error);
            if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
                this.logger.error(`MEBBIS service at ${this.mebbisServiceUrl} is not reachable (${error.code})`);
                throw new common_1.HttpException('MEBBIS service is temporarily unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw new common_1.HttpException(((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || { message: 'Error syncing students from MEBBIS service' }, ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.MebbisClientService = MebbisClientService;
exports.MebbisClientService = MebbisClientService = MebbisClientService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], MebbisClientService);
//# sourceMappingURL=mebbis-client.service.js.map