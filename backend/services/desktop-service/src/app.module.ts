import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { VersionModule } from './version/version.module';
import { DrivingSchoolModule } from './driving-school/driving-school.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { TemplatesModule } from './templates/templates.module';
import { validate, getApiServerDatabaseConfig } from '@surucukursu/shared';
import {
  AdminEntity,
  SessionEntity,
  SubscriptionEntity,
  DrivingSchoolEntity,
  DrivingSchoolManagerEntity,
  DrivingSchoolOwnerEntity,
  DrivingSchoolSettingsEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolStudentIntegrationInfoEntity,
  DrivingSchoolCarEntity,
  MebbisCookie,
  SystemLogsEntity,
  CityEntity,
  DistrictEntity,
  JobEntity,
  PasswordResetTokenEntity,
} from '@surucukursu/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => getApiServerDatabaseConfig(),
    }),
    TypeOrmModule.forFeature([
      AdminEntity,
      SessionEntity,
      SubscriptionEntity,
      DrivingSchoolEntity,
      DrivingSchoolManagerEntity,
      DrivingSchoolOwnerEntity,
      DrivingSchoolSettingsEntity,
      DrivingSchoolStudentEntity,
      DrivingSchoolStudentIntegrationInfoEntity,
      DrivingSchoolCarEntity,
      MebbisCookie,
      SystemLogsEntity,
      CityEntity,
      DistrictEntity,
      JobEntity,
      PasswordResetTokenEntity,
    ]),
    AuthModule,
    VersionModule,
    DrivingSchoolModule,
    ActivityLogModule,
    TemplatesModule,
    HealthModule,
  ],
})
export class AppModule {}
