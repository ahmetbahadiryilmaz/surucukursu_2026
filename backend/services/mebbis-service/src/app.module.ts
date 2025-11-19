import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoginController } from './controllers/login.controller';
import { SyncController } from './controllers/sync.controller';
import { TestController } from './controllers/test.controller';
import { ResponseController } from './controllers/response.controller';
import { TbMebbis } from './entities/tb-mebbis.entity';
import { MebbisGateway } from './mebbis.gateway';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'mebbis',
      entities: [TbMebbis],
      synchronize: true, // Set to false in production
    }),
    TypeOrmModule.forFeature([TbMebbis]),
  ],
  controllers: [
    AppController,
    LoginController,
    SyncController,
    TestController,
    ResponseController,
  ],
  providers: [AppService, MebbisGateway],
})
export class AppModule {}
