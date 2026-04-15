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
var DrivingSchoolService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrivingSchoolService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../../../shared/src");
const shared_2 = require("../../../../../../../shared/src");
const mebbis_client_service_1 = require("../../../../common/clients/mebbis-client.service");
const fs = require("fs");
const path = require("path");
let DrivingSchoolService = DrivingSchoolService_1 = class DrivingSchoolService {
    constructor(drivingSchoolRepository, drivingSchoolSettingsRepository, mebbisClientService) {
        this.drivingSchoolRepository = drivingSchoolRepository;
        this.drivingSchoolSettingsRepository = drivingSchoolSettingsRepository;
        this.mebbisClientService = mebbisClientService;
        this.logger = new common_1.Logger(DrivingSchoolService_1.name);
        this.logToFile('DrivingSchoolService initialized with MebbisClientService');
    }
    logToFile(message, data) {
        try {
            const logsDir = path.join(__dirname, '../../../../../logs');
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateFolder = `${year}-${month}-${day}`;
            const dateDir = path.join(logsDir, dateFolder);
            if (!fs.existsSync(dateDir)) {
                fs.mkdirSync(dateDir, { recursive: true });
            }
            const filePath = path.join(dateDir, 'driving-school-service.log');
            const timestamp = new Date().toISOString();
            let logEntry = `[${timestamp}] ${message}`;
            if (data) {
                logEntry += `\n${JSON.stringify(data, null, 2)}`;
            }
            logEntry += '\n\n';
            fs.appendFileSync(filePath, logEntry, 'utf8');
        }
        catch (error) {
            console.error('Error writing to log file:', error);
        }
    }
    async getDrivingSchoolInfo(code) {
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) },
            select: ['id', 'name', 'address', 'phone']
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        return drivingSchool;
    }
    async getCreds(code) {
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) },
            select: ['name', 'mebbis_username', 'mebbis_credentials_locked']
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException('Driving school not found');
        }
        return {
            name: drivingSchool.name,
            mebbis_username: shared_2.TextEncryptor.mebbisUsernameDecrypt(drivingSchool.mebbis_username),
            mebbis_credentials_locked: drivingSchool.mebbis_credentials_locked
        };
    }
    async updateCreds(code, dto) {
        this.logToFile(`[updateCreds] Called with code: ${code}`);
        this.logger.debug(`updateCreds called with code: ${code}`);
        const schoolId = parseInt(code);
        const school = await this.drivingSchoolRepository.findOne({
            where: { id: schoolId }
        });
        if (!school) {
            this.logToFile(`[updateCreds] School not found for code: ${code}`);
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        const decryptedStoredUsername = school.mebbis_username ? shared_2.TextEncryptor.mebbisUsernameDecrypt(school.mebbis_username) : null;
        if (school.mebbis_credentials_locked && dto.mebbis_username && dto.mebbis_username !== decryptedStoredUsername) {
            this.logToFile(`[updateCreds] Credentials are locked for school: ${code}, attempted to change username from ${decryptedStoredUsername} to ${dto.mebbis_username}`);
            throw new common_1.BadRequestException(`MEBBIS credentials are locked. Username cannot be changed.`);
        }
        this.logToFile(`[updateCreds] [START] Validating MEBBIS credentials for school: ${code}`);
        this.logger.log(`[START] Validating MEBBIS credentials for school: ${code}`);
        this.logger.debug(`Calling mebbisClientService.validateCredentials with username: ${dto.mebbis_username}, drivingSchoolId: ${schoolId}`);
        try {
            const validationResult = await this.mebbisClientService.validateCredentials(dto.mebbis_username, dto.mebbis_password, schoolId);
            this.logToFile(`[updateCreds] Validation result:`, validationResult);
            this.logger.debug(`Validation result:`, validationResult);
            if (!validationResult.success) {
                this.logToFile(`[updateCreds] [FAILED] Credentials validation failed for school: ${code}, message: ${validationResult.message}`);
                this.logger.warn(`[FAILED] MEBBIS credential validation failed for school: ${code}, message: ${validationResult.message}`);
                throw new common_1.BadRequestException(validationResult.message);
            }
            this.logToFile(`[updateCreds] [SUCCESS] MEBBIS credentials validated successfully for school: ${code}`);
            this.logger.log(`[SUCCESS] MEBBIS credentials validated successfully for school: ${code}`);
            const updateData = {};
            if (dto.mebbis_username) {
                updateData.mebbis_username = shared_2.TextEncryptor.mebbisUsernameEncrypt(dto.mebbis_username);
            }
            if (dto.mebbis_password) {
                updateData.mebbis_password = shared_2.TextEncryptor.mebbisPasswordEncrypt(dto.mebbis_password);
            }
            updateData.mebbis_credentials_locked = true;
            this.logToFile(`[updateCreds] Saving credentials to database for school: ${code}`);
            this.logger.log(`Saving credentials to database for school: ${code}`);
            const result = await this.drivingSchoolRepository.update(schoolId, updateData);
            this.logToFile(`[updateCreds] [COMPLETE] Credentials saved successfully`, result);
            return result;
        }
        catch (error) {
            this.logToFile(`[updateCreds] [ERROR] Exception caught:`, {
                message: error.message,
                stack: error.stack
            });
            this.logger.error(`Error in updateCreds:`, error);
            throw error;
        }
    }
    async getSettings(code) {
        var _a;
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });
        if (!drivingSchool) {
            throw new common_1.NotFoundException('Driving school not found');
        }
        let settings = await this.drivingSchoolSettingsRepository.findOne({
            where: { driving_school_id: parseInt(code) }
        });
        if (!settings) {
            settings = this.drivingSchoolSettingsRepository.create({
                driving_school_id: parseInt(code),
                notification_preferences: shared_1.NotificationPreferences.DEFAULT
            });
            await this.drivingSchoolSettingsRepository.save(settings);
        }
        const prefs = (_a = settings.notification_preferences) !== null && _a !== void 0 ? _a : shared_1.NotificationPreferences.DEFAULT;
        return {
            simulator_type: settings.simulator_type,
            student_notifications: shared_1.NotificationPreferencesHelper.hasPreference(prefs, shared_1.NotificationPreferences.STUDENT_NOTIFICATIONS),
            lesson_reminders: shared_1.NotificationPreferencesHelper.hasPreference(prefs, shared_1.NotificationPreferences.LESSON_REMINDERS),
            exam_alerts: shared_1.NotificationPreferencesHelper.hasPreference(prefs, shared_1.NotificationPreferences.EXAM_ALERTS),
            marketing_emails: shared_1.NotificationPreferencesHelper.hasPreference(prefs, shared_1.NotificationPreferences.MARKETING_EMAILS),
            system_updates: shared_1.NotificationPreferencesHelper.hasPreference(prefs, shared_1.NotificationPreferences.SYSTEM_UPDATES),
            auto_scheduling: shared_1.NotificationPreferencesHelper.hasPreference(prefs, shared_1.NotificationPreferences.AUTO_SCHEDULING)
        };
    }
    async updateSettings(code, dto) {
        var _a;
        const school = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });
        if (!school) {
            throw new common_1.NotFoundException(`Driving school with code ${code} not found`);
        }
        let settings = await this.drivingSchoolSettingsRepository.findOne({
            where: { driving_school_id: parseInt(code) }
        });
        if (!settings) {
            settings = this.drivingSchoolSettingsRepository.create({
                driving_school_id: parseInt(code)
            });
        }
        if (dto.simulator_type !== undefined) {
            settings.simulator_type = dto.simulator_type;
        }
        let prefs = (_a = settings.notification_preferences) !== null && _a !== void 0 ? _a : shared_1.NotificationPreferences.DEFAULT;
        if (dto.student_notifications !== undefined) {
            prefs = dto.student_notifications
                ? shared_1.NotificationPreferencesHelper.enablePreference(prefs, shared_1.NotificationPreferences.STUDENT_NOTIFICATIONS)
                : shared_1.NotificationPreferencesHelper.disablePreference(prefs, shared_1.NotificationPreferences.STUDENT_NOTIFICATIONS);
        }
        if (dto.lesson_reminders !== undefined) {
            prefs = dto.lesson_reminders
                ? shared_1.NotificationPreferencesHelper.enablePreference(prefs, shared_1.NotificationPreferences.LESSON_REMINDERS)
                : shared_1.NotificationPreferencesHelper.disablePreference(prefs, shared_1.NotificationPreferences.LESSON_REMINDERS);
        }
        if (dto.exam_alerts !== undefined) {
            prefs = dto.exam_alerts
                ? shared_1.NotificationPreferencesHelper.enablePreference(prefs, shared_1.NotificationPreferences.EXAM_ALERTS)
                : shared_1.NotificationPreferencesHelper.disablePreference(prefs, shared_1.NotificationPreferences.EXAM_ALERTS);
        }
        if (dto.marketing_emails !== undefined) {
            prefs = dto.marketing_emails
                ? shared_1.NotificationPreferencesHelper.enablePreference(prefs, shared_1.NotificationPreferences.MARKETING_EMAILS)
                : shared_1.NotificationPreferencesHelper.disablePreference(prefs, shared_1.NotificationPreferences.MARKETING_EMAILS);
        }
        if (dto.system_updates !== undefined) {
            prefs = dto.system_updates
                ? shared_1.NotificationPreferencesHelper.enablePreference(prefs, shared_1.NotificationPreferences.SYSTEM_UPDATES)
                : shared_1.NotificationPreferencesHelper.disablePreference(prefs, shared_1.NotificationPreferences.SYSTEM_UPDATES);
        }
        if (dto.auto_scheduling !== undefined) {
            prefs = dto.auto_scheduling
                ? shared_1.NotificationPreferencesHelper.enablePreference(prefs, shared_1.NotificationPreferences.AUTO_SCHEDULING)
                : shared_1.NotificationPreferencesHelper.disablePreference(prefs, shared_1.NotificationPreferences.AUTO_SCHEDULING);
        }
        settings.notification_preferences = prefs;
        await this.drivingSchoolSettingsRepository.save(settings);
        return { message: 'Settings updated successfully', success: true };
    }
};
exports.DrivingSchoolService = DrivingSchoolService;
exports.DrivingSchoolService = DrivingSchoolService = DrivingSchoolService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolEntity)),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.DrivingSchoolSettingsEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        mebbis_client_service_1.MebbisClientService])
], DrivingSchoolService);
//# sourceMappingURL=driving-school.service.js.map