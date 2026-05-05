import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolStudentEntity,
  DrivingSchoolStudentMebbisEntity,
  DrivingSchoolStudentMebbisExamEntity,
  DrivingSchoolStudentMebbisLessonEntity,
  DrivingSchoolCarEntity,
  SessionEntity,
} from '@surucukursu/shared';
import { StudentStoreController } from './student-store.controller';
import { StudentStoreService } from './student-store.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DrivingSchoolEntity,
      DrivingSchoolStudentEntity,
      DrivingSchoolStudentMebbisEntity,
      DrivingSchoolStudentMebbisExamEntity,
      DrivingSchoolStudentMebbisLessonEntity,
      DrivingSchoolCarEntity,
      SessionEntity,
    ]),
    AuthModule,
  ],
  controllers: [StudentStoreController],
  providers: [StudentStoreService],
})
export class StudentStoreModule {}
