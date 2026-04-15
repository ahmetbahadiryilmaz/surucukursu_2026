import { HttpService } from '@nestjs/axios';
export interface VehiclesAndSimulatorsResponse {
    session: {
        id: string;
        name: string;
        userId: string;
    };
    vehicles: Array<Record<string, string>>;
    simulators: Array<Record<string, string>>;
    fetchedAt: string;
}
export declare class MebbisClientService {
    private readonly httpService;
    private readonly logger;
    private readonly mebbisServiceUrl;
    constructor(httpService: HttpService);
    validateCredentials(username: string, password: string, drivingSchoolId?: number): Promise<{
        success: boolean;
        message: string;
    }>;
    syncVehicles(drivingSchoolId: number, username: string, password: string, ajandasKodu?: string): Promise<VehiclesAndSimulatorsResponse>;
    fetchVehiclesAndSimulators(cookieString: string, initialPageBody: string, session: {
        tbmebbis_id: string;
        adi: string;
        tbmebbisadi: string;
    }, username?: string, password?: string, ajandasKodu?: string): Promise<VehiclesAndSimulatorsResponse>;
    syncStudents(drivingSchoolId: number, username: string, password: string): Promise<{
        success: boolean;
        students: Array<Record<string, string>>;
        fetchedAt: string;
    }>;
}
