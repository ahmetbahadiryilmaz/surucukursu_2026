import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('CarSyncWorker');
  
  const app = await NestFactory.create(AppModule);
  
  logger.log('🚗 Car Sync Worker starting...');
  
  await app.listen(process.env.WORKER_PORT || 3004);
  
  logger.log(`✅ Car Sync Worker listening on port ${process.env.WORKER_PORT || 3004}`);
}

bootstrap().catch(error => {
  console.error('❌ Worker failed to start:', error);
  process.exit(1);
});
