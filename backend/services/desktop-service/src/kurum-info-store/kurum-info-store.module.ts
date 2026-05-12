import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  DrivingSchoolEntity,
  DrivingSchoolKurumInfoEntity,
  DrivingSchoolKurumProgramEntity,
  DrivingSchoolKurumVehicleEntity,
  SessionEntity,
} from '@surucukursu/shared';
import { KurumInfoStoreController } from './kurum-info-store.controller';
import { KurumInfoStoreService } from './kurum-info-store.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DrivingSchoolEntity,
      DrivingSchoolKurumInfoEntity,
      DrivingSchoolKurumProgramEntity,
      DrivingSchoolKurumVehicleEntity,
      SessionEntity,
    ]),
    AuthModule,
  ],
  controllers: [KurumInfoStoreController],
  providers: [KurumInfoStoreService],
})
export class KurumInfoStoreModule {}
