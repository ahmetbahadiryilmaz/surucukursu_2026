import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { env } from '@surucukursu/shared';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
config({ path: path.resolve(__dirname, '../../../.env') });

async function bootstrap() {
  // Validate environment variables early before any initialization
  try {
    console.log('Validating environment configuration...');
    const envConfig = env.all; // This will trigger validation
    console.log(`Environment loaded successfully. Port: ${env.app.port}, Node_ENV: ${env.app.nodeEnv}`);
  } catch (error) {
    console.error('❌ Environment validation failed. Application cannot start.');
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  const fastifyAdapter = new FastifyAdapter();
  const app: any = await NestFactory.create(
    AppModule,
    fastifyAdapter as any
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
    .setTitle('Surucukursu API Gateway')
    .setDescription('API Gateway for Surucukursu microservices')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = env.services.apiGateway.port;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap();