import { Repository } from 'typeorm';
import { DrivingSchoolStudentEntity, DrivingSchoolEntity, DrivingSchoolStudentIntegrationInfoEntity } from '@surucukursu/shared';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';
export declare class StudentsService {
    private readonly studentRepository;
    private readonly schoolRepository;
    private readonly integrationInfoRepository;
    private readonly mebbisClientService;
    private readonly logger;
    constructor(studentRepository: Repository<DrivingSchoolStudentEntity>, schoolRepository: Repository<DrivingSchoolEntity>, integrationInfoRepository: Repository<DrivingSchoolStudentIntegrationInfoEntity>, mebbisClientService: MebbisClientService);
    getStudents(code: string): Promise<DrivingSchoolStudentEntity[]>;
    syncStudents(code: string, ajandasKodu?: string): Promise<{
        success: boolean;
        message: string;
        syncedCount: number;
    }>;
    private upsertStudents;
    private upsertIntegrationInfo;
}
