import { AdminDrivingSchoolOwnersService } from './admin-driving-school-owners.service';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';
export declare class AdminDrivingSchoolOwnersController {
    private readonly service;
    constructor(service: AdminDrivingSchoolOwnersService);
    getAllOwners(): Promise<import("@surucukursu/shared").DrivingSchoolOwnerEntity[]>;
    getOwnerById(id: string): Promise<import("@surucukursu/shared").DrivingSchoolOwnerEntity>;
    createOwner(dto: CreateOwnerDto): Promise<import("@surucukursu/shared").DrivingSchoolOwnerEntity>;
    updateOwner(id: string, dto: UpdateOwnerDto): Promise<import("@surucukursu/shared").DrivingSchoolOwnerEntity>;
    deleteOwner(id: string): Promise<{
        message: string;
    }>;
}
