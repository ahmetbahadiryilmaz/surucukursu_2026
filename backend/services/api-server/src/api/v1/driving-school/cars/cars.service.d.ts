import { Repository } from 'typeorm';
import { DrivingSchoolCarEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';
export declare class CarsService {
    private readonly carRepository;
    private readonly schoolRepository;
    private readonly mebbisClientService;
    private readonly logger;
    constructor(carRepository: Repository<DrivingSchoolCarEntity>, schoolRepository: Repository<DrivingSchoolEntity>, mebbisClientService: MebbisClientService);
    private parseTurkishDate;
    getCars(code: string): Promise<DrivingSchoolCarEntity[]>;
    syncCars(code: string, ajandasKodu?: string): Promise<{
        success: boolean;
        message: string;
        syncedCount: number;
        vehicleCount: number;
        simulatorCount: number;
    }>;
    private upsertVehicles;
}
