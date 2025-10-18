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
      '/api/v1/worker/update-job',
      '/api/v1/worker/sendtouser'
    ];

    return publicRoutes.some(route => 
      path === route || path.startsWith(route + '/')
    );
  }
}