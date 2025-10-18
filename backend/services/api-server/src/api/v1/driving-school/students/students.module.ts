import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';
import { DrivingSchoolStudentEntity } from '@surucukursu/shared';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolStudentEntity]),
    ],
    controllers: [StudentsController],
    providers: [StudentsService],
    exports: [StudentsService],
})
export class StudentsModule { }