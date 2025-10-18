import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { DrivingSchoolEntity, JobEntity } from '@surucukursu/shared';
import { SocketModule } from '../../../../utils/socket/socket.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolEntity, JobEntity]),
        SocketModule,
    ],
    controllers: [PdfController],
    providers: [PdfService],
    exports: [PdfService],
})
export class PdfModule { }