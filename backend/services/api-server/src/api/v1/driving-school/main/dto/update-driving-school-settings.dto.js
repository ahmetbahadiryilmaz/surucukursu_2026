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
exports.UpdateDrivingSchoolSettingsDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateDrivingSchoolSettingsDto {
}
exports.UpdateDrivingSchoolSettingsDto = UpdateDrivingSchoolSettingsDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Simulator type (sesim or ana_grup)',
        example: 'sesim',
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateDrivingSchoolSettingsDto.prototype, "simulator_type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable student notifications',
        example: true,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDrivingSchoolSettingsDto.prototype, "student_notifications", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable lesson reminders',
        example: true,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDrivingSchoolSettingsDto.prototype, "lesson_reminders", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable exam alerts',
        example: true,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDrivingSchoolSettingsDto.prototype, "exam_alerts", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable marketing emails',
        example: false,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDrivingSchoolSettingsDto.prototype, "marketing_emails", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable system updates',
        example: true,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDrivingSchoolSettingsDto.prototype, "system_updates", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Enable auto scheduling',
        example: false,
        required: false
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateDrivingSchoolSettingsDto.prototype, "auto_scheduling", void 0);
//# sourceMappingURL=update-driving-school-settings.dto.js.map