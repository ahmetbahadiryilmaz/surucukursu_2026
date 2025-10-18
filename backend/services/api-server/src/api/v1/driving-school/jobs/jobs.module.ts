import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobEntity, SessionEntity, DrivingSchoolEntity } from '@surucukursu/shared';

@Module({
  imports: [TypeOrmModule.forFeature([JobEntity, SessionEntity, DrivingSchoolEntity])],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}