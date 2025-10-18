import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionEntity } from '@surucukursu/shared';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([SessionEntity]),
  ],
  providers: [SocketGateway],
  exports: [SocketGateway],
})
export class SocketModule {}