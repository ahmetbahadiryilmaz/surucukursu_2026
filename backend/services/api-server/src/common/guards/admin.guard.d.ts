import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SessionEntity } from '@surucukursu/shared';
export declare class AdminGuard implements CanActivate {
    private jwtService;
    private reflector;
    private sessionRepository;
    constructor(jwtService: JwtService, reflector: Reflector, sessionRepository: Repository<SessionEntity>);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
