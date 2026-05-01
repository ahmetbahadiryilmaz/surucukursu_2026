"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const v1_module_1 = require("./api/v1/v1.module");
const core_1 = require("@nestjs/core");
const shared_1 = require("../../../shared/src");
const auth_guard_1 = require("./common/guards/auth.guard");
const driving_school_guard_1 = require("./common/guards/driving-school.guard");
const socket_module_1 = require("./utils/socket/socket.module");
const shared_2 = require("../../../shared/src");
const typeorm_2 = require("typeorm");
const shared_3 = require("../../../shared/src");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                validate: shared_1.validate,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: async () => {
                    const nodeEnv = process.env.NODE_ENV || 'development';
                    console.log('='.repeat(60));
                    console.log(`LOADED ENVIRONMENT: ${nodeEnv.toUpperCase()}`);
                    console.log('='.repeat(60));
                    if (nodeEnv === 'development') {
                        console.log('Environment Variables:', shared_1.env.all);
                    }
                    try {
                        const dataSource = new typeorm_2.DataSource(Object.assign(Object.assign({ type: 'mysql' }, shared_1.env.database), { synchronize: false, logging: false }));
                        await dataSource.initialize();
                        await dataSource.destroy();
                        console.log('Database connection test successful');
                    }
                    catch (error) {
                        console.error(`Database connection failed to ${shared_1.env.database.host}:${shared_1.env.database.port} as ${shared_1.env.database.username}:`, error);
                        throw new Error(`Unable to connect to database at ${shared_1.env.database.host}:${shared_1.env.database.port} with username ${shared_1.env.database.username}: ${error.message}`);
                    }
                    return (0, shared_1.getApiServerDatabaseConfig)();
                },
            }),
            typeorm_1.TypeOrmModule.forFeature([shared_2.SessionEntity, shared_2.DrivingSchoolEntity, shared_3.DrivingSchoolSettingsEntity]),
            jwt_1.JwtModule.register({
                global: true,
                secret: shared_1.env.jwt.secret,
                signOptions: { expiresIn: '24h' },
            }),
            v1_module_1.V1Module,
            socket_module_1.SocketModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: auth_guard_1.AuthGuard,
            },
            driving_school_guard_1.DrivingSchoolGuard,
        ]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map