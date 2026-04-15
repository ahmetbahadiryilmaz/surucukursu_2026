import { AdminsService } from './admins.service';
import { CreateAdminDto, UpdateAdminDto } from './dto';
export declare class AdminsController {
    private readonly adminService;
    constructor(adminService: AdminsService);
    getAllAdmins(): Promise<import("@surucukursu/shared").AdminEntity[]>;
    getAdminById(id: string): Promise<import("@surucukursu/shared").AdminEntity>;
    createAdmin(dto: CreateAdminDto): Promise<{
        id: number;
        name: string;
        email: string;
        created_at: number;
        updated_at: number;
    }>;
    updateAdmin(id: string, dto: UpdateAdminDto): Promise<import("@surucukursu/shared").AdminEntity>;
}
