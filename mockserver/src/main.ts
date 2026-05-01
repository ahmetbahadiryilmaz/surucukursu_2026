import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { addSwagger } from './lib/swagger';
import { ArgumentsHost, Catch, ExceptionFilter, NotFoundException } from '@nestjs/common';
import fastifyView from '@fastify/view';
import fastifyStatic from '@fastify/static';
import handlebars from 'handlebars';
import { join } from 'path';


@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const getResponse = ctx.getResponse();
    const request = ctx.getRequest();

    getResponse
      .code(405)
      .send({
        statusCode: 405,
        message: 'Resource not found. Please check API documentation',
        path: request.url
      });
  }
}


async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  await app.register(fastifyView, {
    engine: {
      handlebars: handlebars,
    },
    templates: join(__dirname, '..', 'src', 'templates')
  });

  // Register static file serving
  await app.register(fastifyStatic, {
    root: join(__dirname, '..', 'public'),
    prefix: '/', // optional: default '/'
  });




  // Set global prefix first
  /*await app.setGlobalPrefix('api/v1', {
    exclude: ['api/health', 'api/metrics'], // paths to exclude from the prefix
  });*/
  //app.useGlobalFilters(new NotFoundExceptionFilter());

  // Swagger setup
  addSwagger(app)




  await app.enableCors();
  await app.listen(process.env.PORT, '0.0.0.0');
}


bootstrap();

// Handle 404 errors
