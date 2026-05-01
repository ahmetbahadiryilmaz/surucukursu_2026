import { Repository } from 'typeorm';
import { DrivingSchoolManagerEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { CreateManagerDto, UpdateManagerDto } from './dto';
export declare class AdminDrivingSchoolManagersService {
    private readonly managerRepository;
    private readonly schoolRepository;
    constructor(managerRepository: Repository<DrivingSchoolManagerEntity>, schoolRepository: Repository<DrivingSchoolEntity>);
    getAllManagers(): Promise<DrivingSchoolManagerEntity[]>;
    getManagerById(id: number): Promise<DrivingSchoolManagerEntity>;
    createManager(dto: CreateManagerDto): Promise<DrivingSchoolManagerEntity>;
    updateManager(id: number, dto: UpdateManagerDto): Promise<DrivingSchoolManagerEntity>;
    deleteManager(id: number): Promise<{
        message: string;
    }>;
}
