import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { addSwagger } from '@surucukursu/shared';
import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { env } from '@surucukursu/shared';
import { SocketGateway } from './utils/socket/socket.gateway';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
config({ path: path.resolve(__dirname, '../../../.env') });



@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    response
      .code(405)
      .send({
        statusCode: 405,
        message: 'Resource not found. Please check API documentation',
        path: request.url
      });
  }
}


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

  // Set global prefix first
  await app.setGlobalPrefix('api/v1', {
    exclude: ['api/health', 'api/metrics'], // paths to exclude from the prefix
  });
   app.useGlobalFilters(new GlobalExceptionFilter());

  // Setup Swagger
  addSwagger(app);

  // Get the Socket.IO gateway instance and initialize it with Fastify
  const socketGateway = app.get(SocketGateway);
  const fastifyInstance = app.getHttpAdapter().getInstance();

  // Register Socket.IO with Fastify
  const io = require('socket.io')(fastifyInstance.server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Set the Socket.IO server instance on the gateway
  socketGateway.server = io;

  // Initialize Socket.IO event handlers
  socketGateway.afterInit(io);

  // Handle Socket.IO connections
  io.on('connection', (socket) => {
    socketGateway.handleConnection(socket);
    socket.on('disconnect', () => {
      socketGateway.handleDisconnect(socket);
    });
    socket.on('message', (data) => {
      socketGateway.handleMessage(data, socket);
    });
  });

  await app.enableCors();
  await app.listen(env.services.apiServer.port, '0.0.0.0');
}


bootstrap();

// Handle 404 errors
