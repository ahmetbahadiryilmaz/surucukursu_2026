import { DrivingSchoolService } from './driving-school.service';
import { UpdateDrivingSchoolCredsDto } from './dto/update-driving-school-creds.dto';
import { DrivingSchoolCredsDto } from './dto/driving-school-creds.dto';
import { UpdateDrivingSchoolSettingsDto } from './dto/update-driving-school-settings.dto';
import { DrivingSchoolSettingsDto } from './dto/driving-school-settings.dto';
export declare class DrivingSchoolController {
    private readonly drivingSchoolService;
    constructor(drivingSchoolService: DrivingSchoolService);
    getDrivingSchoolInfo(code: string): Promise<import("@surucukursu/shared").DrivingSchoolEntity>;
    getCreds(code: string): Promise<DrivingSchoolCredsDto>;
    updateCreds(code: string, dto: UpdateDrivingSchoolCredsDto): Promise<import("typeorm").UpdateResult>;
    getSettings(code: string): Promise<DrivingSchoolSettingsDto>;
    updateSettings(code: string, dto: UpdateDrivingSchoolSettingsDto): Promise<{
        message: string;
        success: boolean;
    }>;
}
