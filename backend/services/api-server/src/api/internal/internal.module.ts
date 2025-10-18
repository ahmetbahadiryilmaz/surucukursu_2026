import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalController } from './internal.controller';
import { JobUpdateService } from './job-update.service';
import { JobEntity } from '@surucukursu/shared';
import { SocketModule } from '../../utils/socket/socket.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobEntity]),
    SocketModule,
  ],
  controllers: [InternalController],
  providers: [JobUpdateService],
})
export class InternalModule {}