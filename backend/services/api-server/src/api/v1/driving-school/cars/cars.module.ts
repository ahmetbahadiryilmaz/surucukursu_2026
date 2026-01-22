import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { DrivingSchoolCarEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolCarEntity, DrivingSchoolEntity]),
        HttpModule,
    ],
    controllers: [CarsController],
    providers: [CarsService, MebbisClientService],
    exports: [CarsService],
})
export class CarsModule { }