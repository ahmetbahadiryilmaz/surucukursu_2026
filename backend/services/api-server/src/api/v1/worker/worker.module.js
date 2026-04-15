"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const worker_controller_1 = require("./worker.controller");
const worker_service_1 = require("./worker.service");
const socket_module_1 = require("../../../utils/socket/socket.module");
const shared_1 = require("../../../../../../shared/src");
let WorkerModule = class WorkerModule {
};
exports.WorkerModule = WorkerModule;
exports.WorkerModule = WorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [socket_module_1.SocketModule, typeorm_1.TypeOrmModule.forFeature([shared_1.JobEntity])],
        controllers: [worker_controller_1.WorkerController],
        providers: [worker_service_1.WorkerService],
        exports: [worker_service_1.WorkerService],
    })
], WorkerModule);
//# sourceMappingURL=worker.module.js.map