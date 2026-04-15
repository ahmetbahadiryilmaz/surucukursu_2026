import { CarsService } from './cars.service';
export declare class CarsController {
    private readonly carsService;
    constructor(carsService: CarsService);
    getCars(code: string): Promise<import("@surucukursu/shared").DrivingSchoolCarEntity[]>;
    syncCars(code: string, body?: {
        ajandasKodu?: string;
    }): Promise<{
        success: boolean;
        message: string;
        syncedCount: number;
        vehicleCount: number;
        simulatorCount: number;
    }>;
}
