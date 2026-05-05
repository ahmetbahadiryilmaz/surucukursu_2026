import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolStudentMebbisEntity,
  DrivingSchoolStudentMebbisExamEntity,
  DrivingSchoolStudentMebbisLessonEntity,
  DrivingSchoolSettingsEntity,
  DrivingSchoolManagerEntity,
  DrivingSchoolOwnerEntity,
  SessionEntity,
  SubscriptionEntity,
} from '@surucukursu/shared';
import { DrivingSchoolController } from './driving-school.controller';
import { DrivingSchoolService } from './driving-school.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DrivingSchoolEntity,
      DrivingSchoolStudentEntity,
      // Mebbis entities registered alongside the student entity so TypeORM can
      // resolve the OneToOne / OneToMany inverse metadata.
      DrivingSchoolStudentMebbisEntity,
      DrivingSchoolStudentMebbisExamEntity,
      DrivingSchoolStudentMebbisLessonEntity,
      DrivingSchoolSettingsEntity,
      DrivingSchoolManagerEntity,
      DrivingSchoolOwnerEntity,
      SessionEntity,
      SubscriptionEntity,
    ]),
    AuthModule,
  ],
  controllers: [DrivingSchoolController],
  providers: [DrivingSchoolService],
})
export class DrivingSchoolModule {}
