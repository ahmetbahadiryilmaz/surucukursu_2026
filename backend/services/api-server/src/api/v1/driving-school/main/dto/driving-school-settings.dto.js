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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrivingSchoolSettingsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class DrivingSchoolSettingsDto {
}
exports.DrivingSchoolSettingsDto = DrivingSchoolSettingsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Simulator type (sesim or ana_grup)',
        example: 'sesim',
        required: false
    }),
    __metadata("design:type", String)
], DrivingSchoolSettingsDto.prototype, "simulator_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable student notifications',
        example: true
    }),
    __metadata("design:type", Boolean)
], DrivingSchoolSettingsDto.prototype, "student_notifications", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable lesson reminders',
        example: true
    }),
    __metadata("design:type", Boolean)
], DrivingSchoolSettingsDto.prototype, "lesson_reminders", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable exam alerts',
        example: true
    }),
    __metadata("design:type", Boolean)
], DrivingSchoolSettingsDto.prototype, "exam_alerts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable marketing emails',
        example: false
    }),
    __metadata("design:type", Boolean)
], DrivingSchoolSettingsDto.prototype, "marketing_emails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable system updates',
        example: true
    }),
    __metadata("design:type", Boolean)
], DrivingSchoolSettingsDto.prototype, "system_updates", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable auto scheduling',
        example: false
    }),
    __metadata("design:type", Boolean)
], DrivingSchoolSettingsDto.prototype, "auto_scheduling", void 0);
//# sourceMappingURL=driving-school-settings.dto.js.map