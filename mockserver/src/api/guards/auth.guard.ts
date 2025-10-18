import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@lib/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = this.jwtService.verify(token);

      // Check if session exists and is valid
      const session = await this.prisma.session.findFirst({
        where: {
          token,
          expires_at: {
            gt: new Date(),
          },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session expired');
      }

      // Update last activity
      await this.prisma.session.update({
        where: { id: session.id },
        data: { last_activity: new Date() },
      });

      request.user = payload;
 



      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
} 