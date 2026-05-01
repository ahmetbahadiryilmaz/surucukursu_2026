import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SessionEntity, DrivingSchoolEntity } from '@surucukursu/shared';
export declare class AuthGuard implements CanActivate {
    private jwtService;
    private reflector;
    private sessionRepository;
    private drivingSchoolRepository;
    constructor(jwtService: JwtService, reflector: Reflector, sessionRepository: Repository<SessionEntity>, drivingSchoolRepository: Repository<DrivingSchoolEntity>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
