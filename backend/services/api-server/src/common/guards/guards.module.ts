import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { AuthGuard } from './auth.guard';
import { AdminGuard } from './admin.guard';
import { DrivingSchoolGuard } from './driving-school.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity, DrivingSchoolEntity]),
  ],
  providers: [AuthGuard, AdminGuard, DrivingSchoolGuard],
  exports: [AuthGuard, AdminGuard, DrivingSchoolGuard]
})
export class GuardsModule {}