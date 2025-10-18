import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { V1Module } from './api/v1/v1.module';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { validate, env, getApiServerDatabaseConfig } from '@surucukursu/shared';
import { AuthGuard } from './common/guards/auth.guard';
import { AdminGuard } from './common/guards/admin.guard';
import { DrivingSchoolGuard } from './common/guards/driving-school.guard';
import { SocketModule } from './utils/socket/socket.module';
import { SessionEntity, DrivingSchoolEntity } from '@surucukursu/shared';
import { DataSource } from 'typeorm';
import { CustomTypeORMLogger } from '@surucukursu/shared';
 

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const nodeEnv = process.env.NODE_ENV || 'development';
        console.log('='.repeat(60));
        console.log(`LOADED ENVIRONMENT: ${nodeEnv.toUpperCase()}`);
        console.log('='.repeat(60));
        //print all env variables if nodenv is development only from .env file
        if (nodeEnv === 'development') {
          //only .env file read variables
          console.log('Environment Variables:', env.all);

        }
        try {
          const dataSource = new DataSource({
            type: 'mysql',
            ...env.database,
            synchronize: false,
            logging: false,
          });
          await dataSource.initialize();
          await dataSource.destroy();
          console.log('Database connection test successful');
        } catch (error) {
          console.error(`Database connection failed to ${env.database.host}:${env.database.port} as ${env.database.username}:`, error);
          throw new Error(`Unable to connect to database at ${env.database.host}:${env.database.port} with username ${env.database.username}: ${error.message}`);
        }
        
        // Return optimized database configuration from shared config
        return getApiServerDatabaseConfig();
      },
    }),
    TypeOrmModule.forFeature([SessionEntity, DrivingSchoolEntity]),
    JwtModule.register({
      global: true,
      secret: env.jwt.secret,
      signOptions: { expiresIn: '24h' },
    }),
    V1Module,
    SocketModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    DrivingSchoolGuard,
    /*{
      provide: APP_GUARD,
      useClass: AdminGuard,
    },*/
    /*{
     // provide: APP_INTERCEPTOR,
      // useClass: ResponseInterceptor
    },*/
  ]
})
export class AppModule { }