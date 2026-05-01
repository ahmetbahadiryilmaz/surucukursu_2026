import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';
import { CityEntity, DistrictEntity } from '@surucukursu/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([CityEntity, DistrictEntity])
  ],
  controllers: [CitiesController],
  providers: [CitiesService],
  exports: [CitiesService]
})
export class CitiesModule {}
