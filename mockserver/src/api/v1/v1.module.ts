// src/api/v1/v1.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from '../health/health.module';
//import { DrivingSchoolModule } from './driving-school/driving-school.module';
//import { AdminDrivingSchoolsModule } from './admin/driving-schools/admin-driving-schools.module';

@Module({
  imports: [AuthModule, HealthModule
   // DrivingSchoolModule,  
  //AdminDrivingSchoolsModule
  ]
})
export class V1Module { }