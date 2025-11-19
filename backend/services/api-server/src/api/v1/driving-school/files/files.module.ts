import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { DrivingSchoolEntity } from '@surucukursu/shared';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolEntity]),
    ],
    controllers: [FilesController],
    providers: [FilesService],
    exports: [FilesService]
})
export class FilesModule {}
