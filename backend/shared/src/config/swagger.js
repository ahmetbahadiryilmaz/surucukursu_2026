"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSwagger = void 0;
const swagger_1 = require("@nestjs/swagger");
const addSwagger = (app) => {
    const options = new swagger_1.DocumentBuilder()
        .setTitle('PL - Driving School Management System')
        .setDescription('The PL API for managing driving schools, students, and administrative functions')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, options);
    const enhancedDocument = Object.assign(Object.assign({}, document), { openapi: '3.1.0' });
    swagger_1.SwaggerModule.setup('api/swagger1', app, enhancedDocument, {
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
            responseInterceptor: (res) => {
                if (res.headers) {
                    res.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, proxy-revalidate';
                    res.headers['Pragma'] = 'no-cache';
                    res.headers['Expires'] = '0';
                    res.headers['Surrogate-Control'] = 'no-store';
                }
                return res;
            }
        },
    });
};
exports.addSwagger = addSwagger;
//# sourceMappingURL=swagger.js.map