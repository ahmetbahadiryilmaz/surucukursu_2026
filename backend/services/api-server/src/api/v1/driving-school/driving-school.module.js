"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrivingSchoolModule = void 0;
const common_1 = require("@nestjs/common");
const driving_school_module_1 = require("./main/driving-school.module");
const jobs_module_1 = require("./jobs/jobs.module");
const pdf_module_1 = require("./pdf/pdf.module");
const students_module_1 = require("./students/students.module");
const cars_module_1 = require("./cars/cars.module");
const dashboard_module_1 = require("./dashboard/dashboard.module");
let DrivingSchoolModule = class DrivingSchoolModule {
};
exports.DrivingSchoolModule = DrivingSchoolModule;
exports.DrivingSchoolModule = DrivingSchoolModule = __decorate([
    (0, common_1.Module)({
        imports: [
            driving_school_module_1.MainModule,
            jobs_module_1.JobsModule,
            pdf_module_1.PdfModule,
            students_module_1.StudentsModule,
            cars_module_1.CarsModule,
            dashboard_module_1.DashboardModule,
        ],
        providers: [],
        exports: [
            driving_school_module_1.MainModule,
            jobs_module_1.JobsModule,
            pdf_module_1.PdfModule,
            students_module_1.StudentsModule,
            cars_module_1.CarsModule,
            dashboard_module_1.DashboardModule,
        ],
    })
], DrivingSchoolModule);
//# sourceMappingURL=driving-school.module.js.map