import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SlackModule } from '../../../utils/slack/slack.module';
import { AdminEntity, DrivingSchoolOwnerEntity, DrivingSchoolManagerEntity, SessionEntity, SystemLogsEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { GuardsModule } from '../../../common/guards/guards.module';
import { env } from '@surucukursu/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AdminEntity,
      DrivingSchoolOwnerEntity,
      DrivingSchoolManagerEntity,
      SessionEntity,
      SystemLogsEntity,
      DrivingSchoolEntity,
    ]),
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: '24h' },
    }),
    SlackModule,
    GuardsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule { } 