import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDrivingSchoolsController } from './admin-driving-schools.controller';
import { AdminDrivingSchoolsService } from './admin-driving-schools.service';
import { JwtModule } from '@nestjs/jwt';
import { DrivingSchoolEntity, SubscriptionEntity, SystemLogsEntity, SessionEntity, DrivingSchoolStudentEntity, DrivingSchoolCarEntity } from '@surucukursu/shared';
import { GuardsModule } from '../../../../common/guards/guards.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolEntity, SubscriptionEntity, SystemLogsEntity, SessionEntity, DrivingSchoolStudentEntity, DrivingSchoolCarEntity]),
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