import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '@/lib/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RequestWithUser, UserModel } from './dto/types';
import { UserTypes } from './dto/enum';
import TextEncryptor from '@/lib/textEncryptor';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async login(loginDto: LoginDto) {
    let user: UserModel | null = null;
    let userType: UserTypes;

    // Try driving school owner
    if (!user) {
      const ownerUser = await this.prisma.user.findUnique({
        where: { email: loginDto.email }
      });

      if (ownerUser && (loginDto.password) === TextEncryptor.userPasswordDecrypt(ownerUser.password)) {
        user = ownerUser;
        userType = UserTypes.DRIVING_SCHOOL_OWNER;
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

    const existingSessions = await this.prisma.session.findMany({
      where: {
        user_id: user.id,
      }
    });

    if (existingSessions.length > 0) {
      await this.prisma.session.deleteMany({
        where: {
          user_id: user.id,
        }
      });
    }

    // Create session
    await this.prisma.session.create({
      data: {
        token,
        user_id: user.id,
        expires_at: new Date(Date.now() + Number(process.env.SESSION_EXPIRY) * 1000),
      },
    });

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

    await this.prisma.session.deleteMany({
      where: {
        user_id: req.user.id,
        token: token
      }
    });

    return { message: 'Successfully logged out' };
  }
}