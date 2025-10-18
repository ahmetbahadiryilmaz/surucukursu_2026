import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { UserTypes } from '../../api/v1/auth/dto/enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
    @InjectRepository(DrivingSchoolEntity)
    private drivingSchoolRepository: Repository<DrivingSchoolEntity>,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const controllerClass = context.getClass();
    const handler = context.getHandler();
    const request = context.switchToHttp().getRequest();
    const url = request.url;

    console.log(`AuthGuard: Checking access for ${controllerClass.name}.${handler.name} at ${url}`);

    // Skip authentication for WorkerController methods
    if (controllerClass.name === 'WorkerController') {
      console.log(`AuthGuard: Skipping authentication for WorkerController method ${handler.name}`);
      return true;
    }

    // Skip authentication for worker endpoints (they use LocalOnlyGuard)
    if (url.includes('/api/v1/worker/')) {
      console.log(`AuthGuard: Skipping authentication for worker URL ${url}`);
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    console.log(`AuthGuard: isPublic check result: ${isPublic}`);
    if (isPublic) {
      console.log(`AuthGuard: Skipping authentication due to @Public() decorator`);
      return true;
    }

    console.log(`AuthGuard: Proceeding with authentication check`);
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log(`AuthGuard: No token provided, throwing UnauthorizedException`);
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const payload = this.jwtService.verify(token);
      console.log(`AuthGuard: Token verified successfully for user ${payload.id}`);

      // Check if session exists and is valid
      const session = await this.sessionRepository.findOne({ where: { token } });

      if (!session || session.expires_at < Math.floor(Date.now() / 1000)) {
        console.log(`AuthGuard: Session invalid or expired`);
        throw new UnauthorizedException('Session expired');
      }

      // Update last activity
      await this.sessionRepository.update(session.id, { last_activity: Math.floor(Date.now() / 1000) });

      request.user = payload;
      request.user.drivingSchools = await this.drivingSchoolRepository.find({
        where: [
          { owner_id: payload.id },
          { manager_id: payload.id },
        ],
      });

      console.log(`AuthGuard: Authentication successful`);
      return true;
    } catch (error) {
      console.log(`AuthGuard: Authentication failed: ${error.message}`);
      throw new UnauthorizedException();
    }
  }
} 