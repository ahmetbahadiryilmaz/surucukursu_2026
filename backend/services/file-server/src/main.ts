import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
config({ path: path.resolve(__dirname, '../../../.env') });

async function bootstrap() {
  console.log('Starting File Server...');
  console.log(`Node Environment: ${process.env.NODE_ENV || 'development'}`);

  const fastifyAdapter = new FastifyAdapter();
  
  // Register static file serving plugin
  await fastifyAdapter.register(require('@fastify/static'), {
    root: path.resolve(__dirname, '../../../storage'),
    prefix: '/static/', // Static files will be available at /static/
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter,
  );

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS configuration
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Surucukursu File Server')
    .setDescription('File server for serving static files from storage')
    .setVersion('1.0')
    .addTag('files')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = 3002; // File service port
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 File Server is running on: http://localhost:${port}`);
  console.log(`📁 Static files served at: http://localhost:${port}/static/`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap();