import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { env } from '@surucukursu/shared';

@Module({
  imports: [
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AuthGuard, AuthService],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}