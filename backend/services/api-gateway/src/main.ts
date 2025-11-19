import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { env } from '@surucukursu/shared';
import { config } from 'dotenv';
import * as path from 'path';
import httpProxy from 'http-proxy';

// Load environment variables from the backend .env file
config({ path: path.resolve(__dirname, '../../../.env') });

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
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
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    fastifyAdapter
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
  const apiServerPort = env.services.apiServer.port;
  
  await app.listen(port, '0.0.0.0');

  // Setup WebSocket proxy to API Server
  const fastifyInstance = app.getHttpAdapter().getInstance();
  const server = fastifyInstance.server;

  // Create proxy server for WebSocket connections
  const proxy = httpProxy.createProxyServer({
    target: `http://localhost:${apiServerPort}`,
    ws: true,
  });

  // Handle proxy errors
  proxy.on('error', (err, req, res) => {
    logger.error(`WebSocket proxy error: ${err.message}`);
  });

  // Log WebSocket connections
  proxy.on('open', (proxySocket) => {
    logger.log('WebSocket connection established to API Server');
  });

  proxy.on('close', (req, socket, head) => {
    logger.log('WebSocket connection closed');
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (req, socket, head) => {
    logger.log(`WebSocket upgrade request: ${req.url}`);
    proxy.ws(req, socket, head);
  });

  console.log(`🚀 API Gateway is running on: http://localhost:${port}`);
  console.log(`🔌 WebSocket proxy enabled: ws://localhost:${port} -> ws://localhost:${apiServerPort}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap();