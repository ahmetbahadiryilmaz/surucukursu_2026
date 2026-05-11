import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolPersonnelEntity,
  DrivingSchoolPersonnelLinkEntity,
  DrivingSchoolPersonnelProgramEntity,
  SessionEntity,
} from '@surucukursu/shared';
import { PersonnelStoreController } from './personnel-store.controller';
import { PersonnelStoreService } from './personnel-store.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DrivingSchoolEntity,
      DrivingSchoolPersonnelEntity,
      DrivingSchoolPersonnelLinkEntity,
      DrivingSchoolPersonnelProgramEntity,
      SessionEntity,
    ]),
    AuthModule,
  ],
  controllers: [PersonnelStoreController],
  providers: [PersonnelStoreService],
})
export class PersonnelStoreModule {}
