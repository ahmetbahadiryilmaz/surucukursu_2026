import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { DrivingSchoolStudentEntity, DrivingSchoolEntity, DrivingSchoolStudentIntegrationInfoEntity } from '@surucukursu/shared';
import { MebbisClientService } from '../../../../common/clients/mebbis-client.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolStudentEntity, DrivingSchoolEntity, DrivingSchoolStudentIntegrationInfoEntity]),
        HttpModule,
    ],
    controllers: [StudentsController],
    providers: [StudentsService, MebbisClientService],
    exports: [StudentsService],
})
export class StudentsModule { }