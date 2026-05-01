import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import {
  DrivingSchoolOwnerEntity,
  DrivingSchoolManagerEntity,
  SessionEntity,
  PasswordResetTokenEntity,
  env,
} from '@surucukursu/shared';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DesktopAuthGuard } from '../common/guards/desktop-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DrivingSchoolOwnerEntity,
      DrivingSchoolManagerEntity,
      SessionEntity,
      PasswordResetTokenEntity,
    ]),
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, DesktopAuthGuard],
  exports: [DesktopAuthGuard, JwtModule],
})
export class AuthModule {}
