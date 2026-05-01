const { knex } = require('..')
const path = require('path');




module.exports = async app => {
    
    await app.register(require('@fastify/formbody'))
    await app.register(require('@fastify/cors'), {
        origin: (origin, cb) => {
            cb(null, true)
        }
    })
    await app.register( require('fastify-socket.io'), {
        // You can specify options here
        cors: {
          origin: "*", // Allow all origins for demo purposes; adjust as needed
          methods: ["GET", "POST"]
        }
      });

  
    await app.register(require('fastify-multer').contentParser)
    
    app.decorate('knex', knex);
  
 
    /*
    // Register the Swagger plugin
    app.register(swagger, {
      exposeRoute: true,
      routePrefix: '/swagger',
      swagger: {
        info: {
          title: 'Test API',
          description: 'API documentation',
          version: '0.1.0'
        },
        host: 'localhost:3000',
        schemes: ['http'], // Ensure the scheme is 'http' for non-HTTPS use
        consumes: ['application/json'],
        produces: ['application/json']
      }
    });
    
    // Register the Swagger UI plugin
    app.register(swaggerUI, {
      routePrefix: '/swagger',
      swagger: {
        url: '/swagger/json'
      },
      exposeRoute: true,
    
    });
    */
}