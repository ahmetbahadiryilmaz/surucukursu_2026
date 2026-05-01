import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminDrivingSchoolOwnersController } from './admin-driving-school-owners.controller';
import { AdminDrivingSchoolOwnersService } from './admin-driving-school-owners.service';
import { JwtModule } from '@nestjs/jwt';
import { DrivingSchoolOwnerEntity, DrivingSchoolEntity, DrivingSchoolManagerEntity, SessionEntity } from '@surucukursu/shared';
import { GuardsModule } from '../../../../common/guards/guards.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolOwnerEntity, DrivingSchoolEntity, DrivingSchoolManagerEntity, SessionEntity]),
        JwtModule.register({
            secret: process.env.ENCRYPTION_KEY,
            signOptions: { expiresIn: '24h' },
        }),
        GuardsModule,
    ],
    controllers: [AdminDrivingSchoolOwnersController],
    providers: [AdminDrivingSchoolOwnersService]
})
export class AdminDrivingSchoolOwnersModule { }