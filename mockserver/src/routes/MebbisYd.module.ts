// src/routes/MebbisYd.module.ts
import { Module } from '@nestjs/common';
import { MebbisYdIndexModule } from './index/mebbisYdIndex.module';
import { SktModule } from './skt/skt.module';
//import { DrivingSchoolModule } from './driving-school/driving-school.module';
//import { AdminDrivingSchoolsModule } from './admin/driving-schools/admin-driving-schools.module';

@Module({
  imports: [ 
    MebbisYdIndexModule,
    SktModule
    //DrivingSchoolModule,  
    //AdminDrivingSchoolsModule
  ]
})
export class MebbisYdModule { }