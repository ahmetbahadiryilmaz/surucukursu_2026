import { INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

export const addSwagger = (app: any) => {
  const options = new DocumentBuilder()
    .setTitle('PL - Driving School Management System')
    .setDescription('The PL API for managing driving schools, students, and administrative functions')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, options)

  // Enhanced document with hierarchical tags using OpenAPI 3.1 and x-tagGroups fallback
  const enhancedDocument = {
    ...document,
    openapi: '3.1.0', // Use supported OpenAPI version 
    
  } as any

  SwaggerModule.setup('api/swagger1', app, enhancedDocument, {
    customSiteTitle: 'PL - API Documentation',
    customfavIcon: '/favicon.ico',
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
      deepLinking: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      responseInterceptor: (res: any) => {
        if (res.headers) {
          res.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate'
          res.headers['Pragma'] = 'no-cache'
          res.headers['Expires'] = '0'
          res.headers['Surrogate-Control'] = 'no-store'
        }
        return res
      }
    },
  
  })
}