import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; 
import { V1Module } from './api/v1/v1.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './lib/fastify/response.interceptor';
import { MebbisYdModule } from './routes/MebbisYd.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }), 
    V1Module,
    MebbisYdModule,
  ],
  providers: [
    /*{
     // provide: APP_INTERCEPTOR,
      // useClass: ResponseInterceptor
    },*/
  ]
})
export class AppModule { }