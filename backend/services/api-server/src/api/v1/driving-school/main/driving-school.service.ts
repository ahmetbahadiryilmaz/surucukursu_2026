import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DrivingSchoolEntity, DrivingSchoolStudentEntity, DrivingSchoolCarEntity, DrivingSchoolSettingsEntity, NotificationPreferences, NotificationPreferencesHelper } from '@surucukursu/shared';
import { TextEncryptor } from '@surucukursu/shared';
import { UpdateDrivingSchoolCredsDto } from './dto/update-driving-school-creds.dto';
import { DrivingSchoolCredsDto } from './dto/driving-school-creds.dto';
import { UpdateDrivingSchoolSettingsDto } from './dto/update-driving-school-settings.dto';
import { DrivingSchoolSettingsDto } from './dto/driving-school-settings.dto';
import {
  DashboardStats,
  RecentActivity,
  DashboardData,
  DashboardResponse
} from '../../admin/dashboard';

@Injectable()
export class DrivingSchoolService {
    constructor(
      @InjectRepository(DrivingSchoolEntity)
      private readonly drivingSchoolRepository: Repository<DrivingSchoolEntity>,
      @InjectRepository(DrivingSchoolSettingsEntity)
      private readonly drivingSchoolSettingsRepository: Repository<DrivingSchoolSettingsEntity>,
    ) {}

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
            select: ['name', 'mebbis_username']
        });

        if (!drivingSchool) {
            throw new NotFoundException('Driving school not found');
        }

        return {
            name: drivingSchool.name,
            mebbis_username: TextEncryptor.mebbisUsernameDecrypt(drivingSchool.mebbis_username)
        };
    }

    async updateCreds(code: string, dto: UpdateDrivingSchoolCredsDto) {
        const school = await this.drivingSchoolRepository.findOne({
            where: { id: parseInt(code) }
        });

        if (!school) {
            throw new NotFoundException(`Driving school with code ${code} not found`);
        }

        const updateData: any = {};
        if (dto.mebbis_username) {
            updateData.mebbis_username = TextEncryptor.mebbisUsernameEncrypt(dto.mebbis_username);
        }
        if (dto.mebbis_password) {
            updateData.mebbis_password = TextEncryptor.mebbisPasswordEncrypt(dto.mebbis_password);
        }

        return this.drivingSchoolRepository.update(parseInt(code), updateData);
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