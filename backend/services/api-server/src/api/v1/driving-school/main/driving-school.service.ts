import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolEntity, DrivingSchoolStudentEntity, DrivingSchoolCarEntity, DrivingSchoolSettingsEntity, NotificationPreferences, NotificationPreferencesHelper } from '@surucukursu/shared';
import { TextEncryptor } from '@surucukursu/shared';
import { UpdateDrivingSchoolCredsDto } from './dto/update-driving-school-creds.dto';
import { DrivingSchoolCredsDto } from './dto/driving-school-creds.dto';
import { UpdateDrivingSchoolSettingsDto } from './dto/update-driving-school-settings.dto';
import { DrivingSchoolSettingsDto } from './dto/driving-school-settings.dto';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';
import {
  DashboardStats,
  RecentActivity,
  DashboardData,
  DashboardResponse
} from '../../admin/dashboard';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class DrivingSchoolService {
    private readonly logger = new Logger(DrivingSchoolService.name);

    constructor(
      @InjectRepository(DrivingSchoolEntity)
      private readonly drivingSchoolRepository: Repository<DrivingSchoolEntity>,
      @InjectRepository(DrivingSchoolSettingsEntity)
      private readonly drivingSchoolSettingsRepository: Repository<DrivingSchoolSettingsEntity>,
      private readonly mebbisClientService: MebbisClientService,
    ) {
      this.logToFile('DrivingSchoolService initialized with MebbisClientService');
    }

    private logToFile(message: string, data?: any): void {
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
      } catch (error) {
        console.error('Error writing to log file:', error);
      }
    }

    async getDrivingSchoolInfo(code: string) {
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) },
            select: ['id', 'name', 'address', 'phone']
        });

        if (!drivingSchool) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        return drivingSchool;
    }

    async getCreds(code: string): Promise<DrivingSchoolCredsDto> {
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) },
            select: ['name', 'mebbis_username', 'mebbis_credentials_locked']
        });

        if (!drivingSchool) {
            throw new NotFoundException('Driving school not found');
        }

        return {
            name: drivingSchool.name,
            mebbis_username: TextEncryptor.mebbisUsernameDecrypt(drivingSchool.mebbis_username),
            mebbis_credentials_locked: drivingSchool.mebbis_credentials_locked
        };
    }

    async updateCreds(code: string, dto: UpdateDrivingSchoolCredsDto) {
        this.logToFile(`[updateCreds] Called with code: ${code}`);
        this.logger.debug(`updateCreds called with code: ${code}`);
        
        const schoolId = parseInt(code);
        const school = await this.drivingSchoolRepository.findOne({
            where: { id: schoolId }
        });

        if (!school) {
            this.logToFile(`[updateCreds] School not found for code: ${code}`);
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        // Check if credentials are locked and username is being changed
        if (school.mebbis_credentials_locked && dto.mebbis_username) {
            this.logToFile(`[updateCreds] Credentials are locked for school: ${code}`);
            throw new BadRequestException(`MEBBIS credentials are locked. Username cannot be changed.`);
        }

        // Validate credentials with MEBBIS service before saving (always validate)
        this.logToFile(`[updateCreds] [START] Validating MEBBIS credentials for school: ${code}`);
        this.logger.log(`[START] Validating MEBBIS credentials for school: ${code}`);
        this.logger.debug(`Calling mebbisClientService.validateCredentials with username: ${dto.mebbis_username}, drivingSchoolId: ${schoolId}`);
        
        try {
          const validationResult = await this.mebbisClientService.validateCredentials(
              dto.mebbis_username,
              dto.mebbis_password,
              schoolId
          );

          this.logToFile(`[updateCreds] Validation result:`, validationResult);
          this.logger.debug(`Validation result:`, validationResult);

          if (!validationResult.success) {
              this.logToFile(`[updateCreds] [FAILED] Credentials validation failed for school: ${code}, message: ${validationResult.message}`);
              this.logger.warn(`[FAILED] MEBBIS credential validation failed for school: ${code}, message: ${validationResult.message}`);
              throw new BadRequestException(
                  `Invalid MEBBIS credentials: ${validationResult.message}`
              );
          }

          this.logToFile(`[updateCreds] [SUCCESS] MEBBIS credentials validated successfully for school: ${code}`);
          this.logger.log(`[SUCCESS] MEBBIS credentials validated successfully for school: ${code}`);

          // Credentials are valid, proceed with saving
          const updateData: any = {};
          if (dto.mebbis_username) {
              updateData.mebbis_username = TextEncryptor.mebbisUsernameEncrypt(dto.mebbis_username);
          }
          if (dto.mebbis_password) {
              updateData.mebbis_password = TextEncryptor.mebbisPasswordEncrypt(dto.mebbis_password);
          }
          // Mark credentials as verified so they cannot be changed again
          updateData.mebbis_credentials_locked = true;

          this.logToFile(`[updateCreds] Saving credentials to database for school: ${code}`);
          this.logger.log(`Saving credentials to database for school: ${code}`);
          
          const result = await this.drivingSchoolRepository.update(schoolId, updateData);
          this.logToFile(`[updateCreds] [COMPLETE] Credentials saved successfully`, result);
          
          return result;
        } catch (error) {
          this.logToFile(`[updateCreds] [ERROR] Exception caught:`, {
            message: error.message,
            stack: error.stack
          });
          this.logger.error(`Error in updateCreds:`, error);
          throw error;
        }
    }

    async getSettings(code: string): Promise<DrivingSchoolSettingsDto> {
        const drivingSchool = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!drivingSchool) {
            throw new NotFoundException('Driving school not found');
        }

        // Try to get existing settings
        let settings = await this.drivingSchoolSettingsRepository.findOne({
            where: { driving_school_id: parseInt(code) }
        });

        // If no settings exist, create default settings
        if (!settings) {
            settings = this.drivingSchoolSettingsRepository.create({
                driving_school_id: parseInt(code),
                notification_preferences: NotificationPreferences.DEFAULT
            });
            await this.drivingSchoolSettingsRepository.save(settings);
        }

        const prefs = settings.notification_preferences ?? NotificationPreferences.DEFAULT;

        return {
            simulator_type: settings.simulator_type,
            student_notifications: NotificationPreferencesHelper.hasPreference(prefs, NotificationPreferences.STUDENT_NOTIFICATIONS),
            lesson_reminders: NotificationPreferencesHelper.hasPreference(prefs, NotificationPreferences.LESSON_REMINDERS),
            exam_alerts: NotificationPreferencesHelper.hasPreference(prefs, NotificationPreferences.EXAM_ALERTS),
            marketing_emails: NotificationPreferencesHelper.hasPreference(prefs, NotificationPreferences.MARKETING_EMAILS),
            system_updates: NotificationPreferencesHelper.hasPreference(prefs, NotificationPreferences.SYSTEM_UPDATES),
            auto_scheduling: NotificationPreferencesHelper.hasPreference(prefs, NotificationPreferences.AUTO_SCHEDULING)
        };
    }

    async updateSettings(code: string, dto: UpdateDrivingSchoolSettingsDto) {
        const school = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!school) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        // Get or create settings
        let settings = await this.drivingSchoolSettingsRepository.findOne({
            where: { driving_school_id: parseInt(code) }
        });

        if (!settings) {
            settings = this.drivingSchoolSettingsRepository.create({
                driving_school_id: parseInt(code)
            });
        }

        // Update fields
        if (dto.simulator_type !== undefined) {
            settings.simulator_type = dto.simulator_type;
        }
        
        // Update notification preferences using bitwise operations
        let prefs = settings.notification_preferences ?? NotificationPreferences.DEFAULT;
        
        if (dto.student_notifications !== undefined) {
            prefs = dto.student_notifications 
                ? NotificationPreferencesHelper.enablePreference(prefs, NotificationPreferences.STUDENT_NOTIFICATIONS)
                : NotificationPreferencesHelper.disablePreference(prefs, NotificationPreferences.STUDENT_NOTIFICATIONS);
        }
        if (dto.lesson_reminders !== undefined) {
            prefs = dto.lesson_reminders
                ? NotificationPreferencesHelper.enablePreference(prefs, NotificationPreferences.LESSON_REMINDERS)
                : NotificationPreferencesHelper.disablePreference(prefs, NotificationPreferences.LESSON_REMINDERS);
        }
        if (dto.exam_alerts !== undefined) {
            prefs = dto.exam_alerts
                ? NotificationPreferencesHelper.enablePreference(prefs, NotificationPreferences.EXAM_ALERTS)
                : NotificationPreferencesHelper.disablePreference(prefs, NotificationPreferences.EXAM_ALERTS);
        }
        if (dto.marketing_emails !== undefined) {
            prefs = dto.marketing_emails
                ? NotificationPreferencesHelper.enablePreference(prefs, NotificationPreferences.MARKETING_EMAILS)
                : NotificationPreferencesHelper.disablePreference(prefs, NotificationPreferences.MARKETING_EMAILS);
        }
        if (dto.system_updates !== undefined) {
            prefs = dto.system_updates
                ? NotificationPreferencesHelper.enablePreference(prefs, NotificationPreferences.SYSTEM_UPDATES)
                : NotificationPreferencesHelper.disablePreference(prefs, NotificationPreferences.SYSTEM_UPDATES);
        }
        if (dto.auto_scheduling !== undefined) {
            prefs = dto.auto_scheduling
                ? NotificationPreferencesHelper.enablePreference(prefs, NotificationPreferences.AUTO_SCHEDULING)
                : NotificationPreferencesHelper.disablePreference(prefs, NotificationPreferences.AUTO_SCHEDULING);
        }
        
        settings.notification_preferences = prefs;

        await this.drivingSchoolSettingsRepository.save(settings);
        
        return { message: 'Settings updated successfully', success: true };
    }
}