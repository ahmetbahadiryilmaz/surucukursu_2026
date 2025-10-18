import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { SocketModule } from '../../../utils/socket/socket.module';
import { JobEntity } from '@surucukursu/shared';

@Module({
  imports: [SocketModule, TypeOrmModule.forFeature([JobEntity])],
  controllers: [WorkerController],
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}