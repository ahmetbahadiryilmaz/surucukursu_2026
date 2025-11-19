import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { DrivingSchoolFilesModule } from './driving-school-files/driving-school-files.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FilesModule,
    HealthModule,
    DrivingSchoolFilesModule,
  ],
})
export class AppModule {}