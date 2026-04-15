import { Repository } from 'typeorm';
import { DrivingSchoolEntity, DrivingSchoolSettingsEntity } from '@surucukursu/shared';
import { UpdateDrivingSchoolCredsDto } from './dto/update-driving-school-creds.dto';
import { DrivingSchoolCredsDto } from './dto/driving-school-creds.dto';
import { UpdateDrivingSchoolSettingsDto } from './dto/update-driving-school-settings.dto';
import { DrivingSchoolSettingsDto } from './dto/driving-school-settings.dto';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';
export declare class DrivingSchoolService {
    private readonly drivingSchoolRepository;
    private readonly drivingSchoolSettingsRepository;
    private readonly mebbisClientService;
    private readonly logger;
    constructor(drivingSchoolRepository: Repository<DrivingSchoolEntity>, drivingSchoolSettingsRepository: Repository<DrivingSchoolSettingsEntity>, mebbisClientService: MebbisClientService);
    private logToFile;
    getDrivingSchoolInfo(code: string): Promise<DrivingSchoolEntity>;
    getCreds(code: string): Promise<DrivingSchoolCredsDto>;
    updateCreds(code: string, dto: UpdateDrivingSchoolCredsDto): Promise<import("typeorm").UpdateResult>;
    getSettings(code: string): Promise<DrivingSchoolSettingsDto>;
    updateSettings(code: string, dto: UpdateDrivingSchoolSettingsDto): Promise<{
        message: string;
        success: boolean;
    }>;
}
