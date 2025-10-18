import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { SessionEntity } from '@surucukursu/shared';
import { UserTypes } from '../../api/v1/auth/dto/enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class DrivingSchoolGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private reflector: Reflector,
        // @InjectRepository(SessionEntity)
        // private sessionRepository: Repository<SessionEntity>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const token = request.headers.authorization?.split(' ')[1];

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const payload = this.jwtService.verify(token);

            // Check if user is driving school owner or manager or admin
            if (payload.userType !== UserTypes.DRIVING_SCHOOL_OWNER && payload.userType !== UserTypes.DRIVING_SCHOOL_MANAGER && payload.userType !== UserTypes.ADMIN) {
                throw new UnauthorizedException('Driving school access required');
            }

            // TODO: Re-enable session validation
            // Check if session exists and is valid
            // const session = await this.sessionRepository.findOne({
            //     where: {
            //         token,
            //         user_type: payload.userType,
            //         user_id: payload.id,
            //     }
            // });

            // if (!session || session.expires_at < Math.floor(Date.now() / 1000)) {
            //     throw new UnauthorizedException('Session expired');
            // }

            // Update last activity
            // await this.sessionRepository.update(session.id, { last_activity: Math.floor(Date.now() / 1000) });

            request.user = payload;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid driving school access');
        }
    }
}