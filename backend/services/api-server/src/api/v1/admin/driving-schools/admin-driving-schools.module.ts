import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDrivingSchoolsController } from './admin-driving-schools.controller';
import { AdminDrivingSchoolsService } from './admin-driving-schools.service';
import { JwtModule } from '@nestjs/jwt';
import {
    DrivingSchoolEntity,
    SubscriptionEntity,
    SystemLogsEntity,
    SessionEntity,
    DrivingSchoolStudentEntity,
    DrivingSchoolStudentMebbisEntity,
    DrivingSchoolStudentMebbisExamEntity,
    DrivingSchoolStudentMebbisLessonEntity,
    DrivingSchoolCarEntity,
} from '@surucukursu/shared';
import { GuardsModule } from '../../../../common/guards/guards.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            DrivingSchoolEntity,
            SubscriptionEntity,
            SystemLogsEntity,
            SessionEntity,
            DrivingSchoolStudentEntity,
            // The student entity has a OneToOne → mebbis with OneToMany → exams/lessons.
            // TypeORM needs all sides registered so it can compute inverse metadata.
            DrivingSchoolStudentMebbisEntity,
            DrivingSchoolStudentMebbisExamEntity,
            DrivingSchoolStudentMebbisLessonEntity,
            DrivingSchoolCarEntity,
        ]),
        JwtModule.register({
            secret: process.env.ENCRYPTION_KEY,
            signOptions: { expiresIn: '24h' },
        }),
        GuardsModule,
    ],
    controllers: [AdminDrivingSchoolsController],
    providers: [AdminDrivingSchoolsService]
})
export class AdminDrivingSchoolsModule { }