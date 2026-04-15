"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundExceptionFilter = void 0;
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const shared_1 = require("../../../shared/src");
const common_1 = require("@nestjs/common");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
const shared_2 = require("../../../shared/src");
const socket_gateway_1 = require("./utils/socket/socket.gateway");
const dotenv_1 = require("dotenv");
const path = require("path");
(0, dotenv_1.config)({ path: path.resolve(__dirname, '../../../.env') });
let NotFoundExceptionFilter = class NotFoundExceptionFilter {
    catch(exception, host) {
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
};
exports.NotFoundExceptionFilter = NotFoundExceptionFilter;
exports.NotFoundExceptionFilter = NotFoundExceptionFilter = __decorate([
    (0, common_1.Catch)(common_1.NotFoundException)
], NotFoundExceptionFilter);
async function bootstrap() {
    try {
        console.log('Validating environment configuration...');
        const envConfig = shared_2.env.all;
        console.log(`Environment loaded successfully. Port: ${shared_2.env.app.port}, Node_ENV: ${shared_2.env.app.nodeEnv}`);
    }
    catch (error) {
        console.error('❌ Environment validation failed. Application cannot start.');
        console.error('Please check your .env file and ensure all required variables are set.');
        process.exit(1);
    }
    const fastifyAdapter = new platform_fastify_1.FastifyAdapter();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, fastifyAdapter);
    await app.setGlobalPrefix('api/v1', {
        exclude: ['api/health', 'api/metrics'],
    });
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    (0, shared_1.addSwagger)(app);
    const socketGateway = app.get(socket_gateway_1.SocketGateway);
    const fastifyInstance = app.getHttpAdapter().getInstance();
    const io = require('socket.io')(fastifyInstance.server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    socketGateway.server = io;
    socketGateway.afterInit(io);
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
    await app.listen(shared_2.env.services.apiServer.port, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map