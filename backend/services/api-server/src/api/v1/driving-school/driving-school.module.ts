import { Module } from '@nestjs/common';
import { MainModule } from './main/driving-school.module';
import { JobsModule } from './jobs/jobs.module';
import { PdfModule } from './pdf/pdf.module';
import { StudentsModule } from './students/students.module';
import { CarsModule } from './cars/cars.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
    imports: [
        MainModule,
        JobsModule,
        PdfModule,
        StudentsModule,
        CarsModule,
        DashboardModule,
    ],
    providers: [],
    exports: [
        MainModule,
        JobsModule,
        PdfModule,
        StudentsModule,
        CarsModule,
        DashboardModule,
    ],
})
export class DrivingSchoolModule { }