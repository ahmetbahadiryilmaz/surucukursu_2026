import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { StudentsModule } from '../students/students.module';
import { CarsModule } from '../cars/cars.module';

@Module({
    imports: [
        StudentsModule,
        CarsModule,
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
    exports: [DashboardService],
})
export class DashboardModule { }