import { Repository } from 'typeorm';
import { AdminEntity } from '@surucukursu/shared';
import { CreateAdminDto, UpdateAdminDto } from './dto';
export declare class AdminsService {
    private readonly adminRepository;
    constructor(adminRepository: Repository<AdminEntity>);
    getAllAdmins(): Promise<AdminEntity[]>;
    getAdminById(id: number): Promise<AdminEntity>;
    createAdmin(dto: CreateAdminDto): Promise<{
        id: number;
        name: string;
        email: string;
        created_at: number;
        updated_at: number;
    }>;
    updateAdmin(id: number, dto: UpdateAdminDto): Promise<AdminEntity>;
}
