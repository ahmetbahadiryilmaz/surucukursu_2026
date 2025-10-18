import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { DrivingSchoolCarEntity } from '@surucukursu/shared';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolCarEntity]),
    ],
    controllers: [CarsController],
    providers: [CarsService],
    exports: [CarsService],
})
export class CarsModule { }