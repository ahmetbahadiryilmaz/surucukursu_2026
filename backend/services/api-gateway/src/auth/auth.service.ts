import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return payload;
    } catch (error) {
      return null;
    }
  }

  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }

  isPublicRoute(path: string): boolean {
    const publicRoutes = [
      '/',
      '/health',
      '/health/ready',
      '/health/live',
      '/version',
      '/docs',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/desktop/desktop-service/auth/login',
      '/desktop/desktop-service/auth/forgot-password',
      '/desktop/desktop-service/auth/verify-reset-code',
      '/desktop/desktop-service/auth/reset-password',
      '/desktop/desktop-service/version',
      '/desktop/desktop-service/templates',
    ];

    return publicRoutes.some(route => 
      path === route || path.startsWith(route + '/') || path.startsWith(route)
    );
  }
}