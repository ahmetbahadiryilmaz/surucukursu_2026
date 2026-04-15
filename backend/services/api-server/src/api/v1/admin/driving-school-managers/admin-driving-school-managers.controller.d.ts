import { AdminDrivingSchoolManagersService } from './admin-driving-school-managers.service';
import { CreateManagerDto, UpdateManagerDto } from './dto';
export declare class AdminDrivingSchoolManagersController {
    private readonly service;
    constructor(service: AdminDrivingSchoolManagersService);
    getAllManagers(): Promise<import("@surucukursu/shared").DrivingSchoolManagerEntity[]>;
    getManagerById(id: string): Promise<import("@surucukursu/shared").DrivingSchoolManagerEntity>;
    createManager(dto: CreateManagerDto): Promise<import("@surucukursu/shared").DrivingSchoolManagerEntity>;
    updateManager(id: string, dto: UpdateManagerDto): Promise<import("@surucukursu/shared").DrivingSchoolManagerEntity>;
    deleteManager(id: string): Promise<{
        message: string;
    }>;
}
