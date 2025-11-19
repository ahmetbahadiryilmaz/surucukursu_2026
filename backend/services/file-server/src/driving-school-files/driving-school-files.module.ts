import { Module } from '@nestjs/common';
import { DrivingSchoolFilesController } from './driving-school-files.controller';
import { DrivingSchoolFilesService } from './driving-school-files.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [DrivingSchoolFilesController],
  providers: [DrivingSchoolFilesService],
  exports: [DrivingSchoolFilesService],
})
export class DrivingSchoolFilesModule {}
