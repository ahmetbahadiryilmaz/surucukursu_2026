// src/api/v1/v1.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from '../health/health.module';
import { AdminDrivingSchoolsModule } from './admin/driving-schools/admin-driving-schools.module';
import { AdminDrivingSchoolManagersModule } from './admin/driving-school-managers/admin-driving-school-managers.module';
import { AdminDrivingSchoolOwnersModule } from './admin/driving-school-owners/admin-driving-school-owners.module';
import { AdminsModule } from './admin/admins/admins.module';
import { SystemLogsModule } from './admin/system-logs/system-logs.module';
import { AdminDashboardModule } from './admin/dashboard/dashboard.module';
import { CitiesModule } from './cities/cities.module';
import { InternalModule } from '../internal/internal.module';

@Module({
  imports: [
    AuthModule,
    HealthModule,
    AdminDrivingSchoolsModule,
    AdminDrivingSchoolManagersModule,
    AdminDrivingSchoolOwnersModule,
    AdminsModule,
    SystemLogsModule,
    AdminDashboardModule,
    CitiesModule,
    InternalModule,
  ]
})
export class V1Module { }