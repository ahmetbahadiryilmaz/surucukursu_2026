import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { VersionModule } from './version/version.module';
import { DrivingSchoolModule } from './driving-school/driving-school.module';
import { ActivityLogModule } from './activity-log/activity-log.module';
import { TemplatesModule } from './templates/templates.module';
import { DesktopCodeModule } from './desktop-code/desktop-code.module';
import { StudentStoreModule } from './student-store/student-store.module';
import { PersonnelStoreModule } from './personnel-store/personnel-store.module';
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
  DrivingSchoolStudentMebbisEntity,
  DrivingSchoolStudentMebbisExamEntity,
  DrivingSchoolStudentMebbisLessonEntity,
  DrivingSchoolPersonnelEntity,
  DrivingSchoolPersonnelLinkEntity,
  DrivingSchoolPersonnelProgramEntity,
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
      DrivingSchoolStudentMebbisEntity,
      DrivingSchoolStudentMebbisExamEntity,
      DrivingSchoolStudentMebbisLessonEntity,
      DrivingSchoolPersonnelEntity,
      DrivingSchoolPersonnelLinkEntity,
      DrivingSchoolPersonnelProgramEntity,
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
    DesktopCodeModule,
    StudentStoreModule,
    PersonnelStoreModule,
    HealthModule,
  ],
})
export class AppModule {}
