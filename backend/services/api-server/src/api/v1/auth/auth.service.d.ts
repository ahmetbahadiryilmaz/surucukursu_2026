import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RequestWithUser } from './dto/types';
import { UserTypes } from './dto/enum';
import { SlackService } from '../../../utils/slack/slack.service';
import { AdminEntity, DrivingSchoolOwnerEntity, DrivingSchoolManagerEntity, SessionEntity, SystemLogsEntity } from '@surucukursu/shared';
export declare class AuthService {
    private jwtService;
    private slackService;
    private adminRepository;
    private drivingSchoolOwnerRepository;
    private drivingSchoolManagerRepository;
    private sessionRepository;
    private systemLogsRepository;
    constructor(jwtService: JwtService, slackService: SlackService, adminRepository: Repository<AdminEntity>, drivingSchoolOwnerRepository: Repository<DrivingSchoolOwnerEntity>, drivingSchoolManagerRepository: Repository<DrivingSchoolManagerEntity>, sessionRepository: Repository<SessionEntity>, systemLogsRepository: Repository<SystemLogsEntity>);
    login(loginDto: LoginDto): Promise<{
        token: string;
        user: {
            id: number;
            email: string;
            name: string;
            userType: UserTypes;
        };
    }>;
    logout(req: RequestWithUser): Promise<{
        message: string;
    }>;
}
