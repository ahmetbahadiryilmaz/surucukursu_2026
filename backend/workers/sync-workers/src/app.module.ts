import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEntity, DrivingSchoolCarEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { RabbitMQService } from './services/rabbitmq.service';
import { CarSyncService } from './services/car-sync.service';
import { SocketService } from './services/socket.service';
import { MebbisClientService } from './clients/mebbis-client.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'surucukursu',
      entities: [JobEntity, DrivingSchoolCarEntity, DrivingSchoolEntity],
      synchronize: false,
      logging: false,
    }),
    TypeOrmModule.forFeature([JobEntity, DrivingSchoolCarEntity, DrivingSchoolEntity]),
  ],
  providers: [RabbitMQService, CarSyncService, SocketService, MebbisClientService],
  exports: [RabbitMQService, CarSyncService, SocketService, MebbisClientService],
})
export class AppModule {}
