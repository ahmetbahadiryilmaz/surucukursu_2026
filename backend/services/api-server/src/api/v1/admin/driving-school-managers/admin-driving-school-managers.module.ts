import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDrivingSchoolManagersController } from './admin-driving-school-managers.controller';
import { AdminDrivingSchoolManagersService } from './admin-driving-school-managers.service';
import { JwtModule } from '@nestjs/jwt';
import { DrivingSchoolManagerEntity, DrivingSchoolEntity, SessionEntity } from '@surucukursu/shared';
import { GuardsModule } from '../../../../common/guards/guards.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolManagerEntity, DrivingSchoolEntity, SessionEntity]),
        JwtModule.register({
            secret: process.env.ENCRYPTION_KEY,
            signOptions: { expiresIn: '24h' },
        }),
        GuardsModule,
    ],
    controllers: [AdminDrivingSchoolManagersController],
    providers: [AdminDrivingSchoolManagersService]
})
export class AdminDrivingSchoolManagersModule { }