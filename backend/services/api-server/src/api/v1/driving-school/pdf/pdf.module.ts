import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { DrivingSchoolEntity, JobEntity } from '@surucukursu/shared';
import { SocketModule } from '../../../../utils/socket/socket.module';
import { RabbitMQService } from '../../../../utils/rabbitmq';

@Module({
    imports: [
        TypeOrmModule.forFeature([DrivingSchoolEntity, JobEntity]),
        SocketModule,
    ],
    controllers: [PdfController],
    providers: [PdfService, RabbitMQService],
    exports: [PdfService],
})
export class PdfModule { }