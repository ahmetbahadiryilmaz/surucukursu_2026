import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { AdminUser, RequestWithUser, UserModel } from './dto/types';
import { SystemLogProcessTypes, UserTypes } from './dto/enum';
import { TextEncryptor } from '@surucukursu/shared';
import { SlackService } from '../../../utils/slack/slack.service';
import { AdminEntity, DrivingSchoolOwnerEntity, DrivingSchoolManagerEntity, SessionEntity, SystemLogsEntity } from '@surucukursu/shared';
import { env } from '@surucukursu/shared';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private slackService: SlackService,
    @InjectRepository(AdminEntity)
    private adminRepository: Repository<AdminEntity>,
    @InjectRepository(DrivingSchoolOwnerEntity)
    private drivingSchoolOwnerRepository: Repository<DrivingSchoolOwnerEntity>,
    @InjectRepository(DrivingSchoolManagerEntity)
    private drivingSchoolManagerRepository: Repository<DrivingSchoolManagerEntity>,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(SystemLogsEntity)
    private systemLogsRepository: Repository<SystemLogsEntity>,
  ) { }

  async login(loginDto: LoginDto) {
    let user: UserModel | null = null;
    let userType: UserTypes

    // Try driving school owner
    if (!user) {
      const ownerUser = await this.drivingSchoolOwnerRepository.findOne({ where: { email: loginDto.email } });

      if (ownerUser && (loginDto.password) === TextEncryptor.userPasswordDecrypt(ownerUser.password)) {
        user = ownerUser as any;
        userType = UserTypes.DRIVING_SCHOOL_OWNER;
      }
    }

    // Try driving school manager
    if (!user) {
      const managerUser = await this.drivingSchoolManagerRepository.findOne({ where: { email: loginDto.email } });

      if (managerUser && (loginDto.password) === TextEncryptor.userPasswordDecrypt(managerUser.password)) {
        user = managerUser as any;
        userType = UserTypes.DRIVING_SCHOOL_MANAGER;
      }
    }

    if (!user) {
      // Try admin
      const adminUser = await this.adminRepository.findOne({ where: { email: loginDto.email } });

      if (adminUser && (loginDto.password) == TextEncryptor.userPasswordDecrypt(adminUser.password)) {
        user = adminUser as unknown as AdminUser;
        userType = UserTypes.ADMIN;
      }
    }

    if (!user || !userType) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      userType: userType,
      date: Math.floor(Date.now() / 1000),
      jwtid: crypto.randomUUID(),
    });


    const existingSessions = await this.sessionRepository.find({
      where: { user_id: user.id, user_type: userType }
    });

    if (existingSessions.length > 0) {
      await this.sessionRepository.delete({ user_id: user.id, user_type: userType } as any);
    }

    // Create session
    await this.sessionRepository.save({
      token,
      user_id: user.id,
      user_type: userType,
      expires_at: Math.floor(Date.now() / 1000) + env.session.expiry,
      last_activity: Math.floor(Date.now() / 1000),
      last_login: Math.floor(Date.now() / 1000),
    });

    // Log the login action
    await this.systemLogsRepository.save({
      user_id: user.id,
      user_type: userType,
      process: SystemLogProcessTypes.LOGIN,
      description: `User logged in: ${user.email} (${userType})`
    });
    await this.slackService.sendNotification(
      "Login Notification",
      `User logged in: ${user.email} (${userType})`,
      1
    );
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        userType: userType,
      },
    };

  }

  async logout(req: RequestWithUser) {
    const authHeader = req.headers['authorization'];  // Use bracket notation
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    /* await this.prisma.session.deleteMany({
      where: {
        user_id: req.user.id,
        token: token
      }
    });*/

    await this.systemLogsRepository.save({
      user_id: req.user.id,
      user_type: req.user.role || UserTypes.ADMIN,
      process: SystemLogProcessTypes.LOGOUT,
      description: `User logged out: ${req.user.email} (${req.user.role})`
    });

    

    return { message: 'Successfully logged out' };
  }
}