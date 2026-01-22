import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { DrivingSchoolController } from './driving-school.controller';
import { DrivingSchoolService } from './driving-school.service';
import { DrivingSchoolEntity, DrivingSchoolSettingsEntity, SessionEntity } from '@surucukursu/shared';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';

@Module({
    imports: [
        HttpModule,
        TypeOrmModule.forFeature([DrivingSchoolEntity, DrivingSchoolSettingsEntity, SessionEntity]),
    ],
    controllers: [DrivingSchoolController],
    providers: [DrivingSchoolService, MebbisClientService],
})
export class MainModule { }