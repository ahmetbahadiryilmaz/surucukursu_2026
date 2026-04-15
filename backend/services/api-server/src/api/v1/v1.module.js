"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.V1Module = void 0;
const common_1 = require("@nestjs/common");
const auth_module_1 = require("./auth/auth.module");
const health_module_1 = require("../health/health.module");
const driving_school_module_1 = require("./driving-school/driving-school.module");
const admin_driving_schools_module_1 = require("./admin/driving-schools/admin-driving-schools.module");
const admin_driving_school_managers_module_1 = require("./admin/driving-school-managers/admin-driving-school-managers.module");
const admin_driving_school_owners_module_1 = require("./admin/driving-school-owners/admin-driving-school-owners.module");
const admins_module_1 = require("./admin/admins/admins.module");
const system_logs_module_1 = require("./admin/system-logs/system-logs.module");
const dashboard_module_1 = require("./admin/dashboard/dashboard.module");
const cities_module_1 = require("./cities/cities.module");
const internal_module_1 = require("../internal/internal.module");
const worker_module_1 = require("./worker/worker.module");
const desktop_update_module_1 = require("./desktop-update/desktop-update.module");
let V1Module = class V1Module {
};
exports.V1Module = V1Module;
exports.V1Module = V1Module = __decorate([
    (0, common_1.Module)({
        imports: [
            auth_module_1.AuthModule,
            health_module_1.HealthModule,
            driving_school_module_1.DrivingSchoolModule,
            admin_driving_schools_module_1.AdminDrivingSchoolsModule,
            admin_driving_school_managers_module_1.AdminDrivingSchoolManagersModule,
            admin_driving_school_owners_module_1.AdminDrivingSchoolOwnersModule,
            admins_module_1.AdminsModule,
            system_logs_module_1.SystemLogsModule,
            dashboard_module_1.AdminDashboardModule,
            cities_module_1.CitiesModule,
            internal_module_1.InternalModule,
            worker_module_1.WorkerModule,
            desktop_update_module_1.DesktopUpdateModule,
        ]
    })
], V1Module);
//# sourceMappingURL=v1.module.js.map