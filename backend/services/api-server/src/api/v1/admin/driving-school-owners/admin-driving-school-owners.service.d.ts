import { Repository } from 'typeorm';
import { DrivingSchoolOwnerEntity, DrivingSchoolEntity, DrivingSchoolManagerEntity } from '@surucukursu/shared';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';
export declare class AdminDrivingSchoolOwnersService {
    private readonly ownerRepository;
    private readonly schoolRepository;
    private readonly managerRepository;
    constructor(ownerRepository: Repository<DrivingSchoolOwnerEntity>, schoolRepository: Repository<DrivingSchoolEntity>, managerRepository: Repository<DrivingSchoolManagerEntity>);
    getAllOwners(): Promise<DrivingSchoolOwnerEntity[]>;
    getOwnerById(id: number): Promise<DrivingSchoolOwnerEntity>;
    createOwner(dto: CreateOwnerDto): Promise<DrivingSchoolOwnerEntity>;
    updateOwner(id: number, dto: UpdateOwnerDto): Promise<DrivingSchoolOwnerEntity>;
    deleteOwner(id: number): Promise<{
        message: string;
    }>;
}
