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
exports.SystemLogsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
let SystemLogsService = class SystemLogsService {
    constructor(systemLogsRepository) {
        this.systemLogsRepository = systemLogsRepository;
    }
    async getLogs(query) {
        const { page = 1, limit = 10, userId, userType, process } = query;
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const where = {
            deleted_at: null,
        };
        if (userId) {
            where.user_id = userId;
        }
        if (userType !== undefined) {
            where.user_type = parseInt(userType.toString(), 10);
        }
        if (process !== undefined) {
            where.process = parseInt(process.toString(), 10);
        }
        const total = await this.systemLogsRepository.count({ where });
        const logs = await this.systemLogsRepository.find({
            where,
            skip,
            take: limitNum,
            order: {
                created_at: 'DESC',
            },
        });
        const mappedLogs = logs.map(log => (Object.assign(Object.assign({}, log), { created_at: new Date(log.created_at * 1000), admin_id: log.user_type === 1 ? log.user_id : null })));
        const totalPages = Math.ceil(total / limitNum);
        return {
            data: mappedLogs,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages,
        };
    }
};
exports.SystemLogsService = SystemLogsService;
exports.SystemLogsService = SystemLogsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.SystemLogsEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SystemLogsService);
//# sourceMappingURL=system-logs.service.js.map