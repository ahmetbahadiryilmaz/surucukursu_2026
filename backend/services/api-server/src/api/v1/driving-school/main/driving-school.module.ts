import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DrivingSchoolController } from './driving-school.controller';
import { DrivingSchoolService } from './driving-school.service';
import { DrivingSchoolEntity, DrivingSchoolSettingsEntity, SessionEntity } from '@surucukursu/shared';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolEntity, DrivingSchoolSettingsEntity, SessionEntity]),
    ],
    controllers: [DrivingSchoolController],
    providers: [DrivingSchoolService],
})
export class MainModule { }