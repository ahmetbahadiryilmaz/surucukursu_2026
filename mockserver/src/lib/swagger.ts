import { NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { RawServerDefault } from 'fastify'

export const addSwagger = (app: NestFastifyApplication<RawServerDefault>) => {
  const options = new DocumentBuilder()
    .setTitle('PL')
    .setDescription('The PL API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('api')
    .build()

  const document = SwaggerModule.createDocument(app, options)

  SwaggerModule.setup('api/swagger1', app, document, {
    customSiteTitle: 'API Documentation',
    customfavIcon: '/favicon.ico',
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      tryItOutEnabled: true,
      deepLinking: true,
      responseInterceptor: (res: any) => {
        if (res.headers) {
          res.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate'
          res.headers['Pragma'] = 'no-cache'
          res.headers['Expires'] = '0'
          res.headers['Surrogate-Control'] = 'no-store'
        }
        return res
      }
    }
  })
}