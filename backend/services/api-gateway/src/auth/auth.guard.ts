import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: FastifyRequest = context.switchToHttp().getRequest();
    const path = request.url;

    // Check if route is public
    if (this.authService.isPublicRoute(path)) {
      return true;
    }

    // Extract token from header
    const authHeader = request.headers.authorization as string;
    const token = this.authService.extractTokenFromHeader(authHeader);

    if (!token) {
      this.logger.warn(`No token provided for protected route: ${path}`);
      throw new UnauthorizedException('Access token is required');
    }

    // Validate token
    const payload = await this.authService.validateToken(token);
    
    if (!payload) {
      this.logger.warn(`Invalid token for route: ${path}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Add user info to request
    (request as any).user = payload;
    
    this.logger.debug(`Authenticated request for user: ${payload.sub || payload.id}`);
    return true;
  }
}