import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth.service';
import { SyncService } from './sync.service';
import { ResponseService } from './response.service';
import { TestService } from './test.service';
import { LoginController } from './controllers/auth.controller';
import { SyncController } from './controllers/sync.controller';
import { TestController } from './controllers/test.controller';
import { ResponseController } from './controllers/response.controller';
import { TbMebbis } from './entities/tb-mebbis.entity';
import { MebbisCookie } from '@surucukursu/shared';
import { MebbisGateway } from './mebbis.gateway';
import { RequestLoggingMiddleware } from './utils/request-logging.middleware';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.MEBBIS_DB_NAME || process.env.DB_NAME || 'mebbis',
      entities: [TbMebbis, MebbisCookie],
      synchronize: true, // Set to false in production
    }),
    TypeOrmModule.forFeature([TbMebbis, MebbisCookie]),
  ],
  controllers: [
    AppController,
    LoginController,
    SyncController,
    TestController,
    ResponseController,
  ],
  providers: [
    AppService,
    AuthService,
    SyncService,
    ResponseService,
    TestService,
    MebbisGateway,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
