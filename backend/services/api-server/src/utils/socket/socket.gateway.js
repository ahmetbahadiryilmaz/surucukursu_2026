"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const shared_1 = require("../../../../../shared/src");
let SocketGateway = class SocketGateway {
    constructor(jwtService, sessionRepository) {
        this.jwtService = jwtService;
        this.sessionRepository = sessionRepository;
        this.logger = new common_1.Logger('SocketGateway');
    }
    afterInit(server) {
        this.logger.log('Socket.IO server initialized');
    }
    async handleConnection(client, ...args) {
        var _a;
        try {
            const token = client.handshake.query.token;
            const userId = client.handshake.query.userId;
            if (!token) {
                this.logger.error(`No token provided for client ${client.id}`);
                client.emit('auth_error', {
                    code: 'NO_TOKEN',
                    message: 'Authentication token is required',
                    shouldReconnect: false
                });
                client.disconnect(true);
                return;
            }
            if (!userId) {
                this.logger.error(`No userId provided for client ${client.id}`);
                client.emit('auth_error', {
                    code: 'NO_USER_ID',
                    message: 'User ID is required',
                    shouldReconnect: false
                });
                client.disconnect(true);
                return;
            }
            let payload;
            try {
                payload = this.jwtService.verify(token);
            }
            catch (jwtError) {
                this.logger.error(`JWT verification failed for client ${client.id}: ${jwtError.message}`);
                client.emit('auth_error', {
                    code: 'INVALID_TOKEN',
                    message: 'Invalid or expired token',
                    shouldReconnect: false
                });
                client.disconnect(true);
                return;
            }
            if (((_a = payload.id) === null || _a === void 0 ? void 0 : _a.toString()) !== (userId === null || userId === void 0 ? void 0 : userId.toString())) {
                this.logger.error(`User ID mismatch for client ${client.id}. Expected: ${payload.id}, Got: ${userId}`);
                client.emit('auth_error', {
                    code: 'USER_ID_MISMATCH',
                    message: 'User ID does not match token',
                    shouldReconnect: false
                });
                client.disconnect(true);
                return;
            }
            const session = await this.sessionRepository.findOne({
                where: { token, user_id: parseInt(userId) }
            });
            if (!session) {
                this.logger.error(`Session not found for client ${client.id}`);
                client.emit('auth_error', {
                    code: 'SESSION_NOT_FOUND',
                    message: 'Session not found',
                    shouldReconnect: false
                });
                client.disconnect(true);
                return;
            }
            if (session.expires_at < Math.floor(Date.now() / 1000)) {
                this.logger.error(`Session expired for client ${client.id}`);
                client.emit('auth_error', {
                    code: 'SESSION_EXPIRED',
                    message: 'Session has expired',
                    shouldReconnect: false
                });
                client.disconnect(true);
                return;
            }
            client.data.user = payload;
            client.data.userId = userId;
            await this.sessionRepository.update(session.id, {
                last_activity: Math.floor(Date.now() / 1000)
            });
            const helloMessage = `Hello ${payload.email}! You are now connected to the system.`;
            this.logger.log(`Sending hello message to ${client.id}: ${helloMessage}`);
            client.emit('hello', {
                message: helloMessage,
                user: {
                    id: payload.id,
                    email: payload.email,
                    userType: payload.userType
                },
                timestamp: new Date().toISOString()
            });
            await this.sendOngoingJobsToUser(payload.id);
            this.logger.log(`Client connected: ${client.id} (User: ${payload.id})`);
        }
        catch (error) {
            this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
            client.emit('auth_error', {
                code: 'AUTH_FAILED',
                message: 'Authentication failed',
                shouldReconnect: false
            });
            client.disconnect(true);
        }
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleMessage(data, client) {
        this.logger.log(`Message received from ${client.id}: ${JSON.stringify(data)}`);
        if (data.type === 'hello' && data.content) {
            const user = client.data.user;
            if (user) {
                const helloResponse = `Hello ${user.email}! Welcome to the system.`;
                this.logger.log(`Sending hello response to ${client.id}: ${helloResponse}`);
                client.emit('message', {
                    type: 'hello_response',
                    content: helloResponse,
                    timestamp: new Date().toISOString()
                });
                return `Hello received from ${user.email}`;
            }
        }
        return 'Message received!';
    }
    emitToAll(event, data) {
        this.server.emit(event, data);
    }
    emitToRoom(room, event, data) {
        this.server.to(room).emit(event, data);
    }
    emitToAuthenticatedUsers(event, data) {
        this.server.sockets.sockets.forEach((socket) => {
            if (socket.data.user) {
                socket.emit(event, data);
            }
        });
    }
    emitToUser(userId, event, data) {
        this.server.sockets.sockets.forEach((socket) => {
            if (socket.data.userId == userId.toString()) {
                socket.emit(event, data);
            }
        });
    }
    emitPdfProgress(jobId, progressData) {
        this.logger.debug(`Emitting PDF progress for job ${jobId}: ${progressData.progress}%`);
        this.emitToAuthenticatedUsers('job-update', Object.assign(Object.assign({ jobId }, progressData), { timestamp: new Date().toISOString() }));
    }
    emitPdfCompleted(jobId, result) {
        this.logger.log(`Emitting PDF completion for job ${jobId}`);
        this.emitToAuthenticatedUsers('pdf-completed', {
            jobId,
            result,
            timestamp: new Date().toISOString()
        });
    }
    emitPdfError(jobId, error) {
        this.logger.error(`Emitting PDF error for job ${jobId}: ${error}`);
        this.emitToAuthenticatedUsers('pdf-error', {
            jobId,
            error,
            timestamp: new Date().toISOString()
        });
    }
    async sendOngoingJobsToUser(userId) {
        try {
            const ongoingJobs = await this.sessionRepository.manager.find(shared_1.JobEntity, {
                where: {
                    status: shared_1.JobStatus.PROCESSING
                },
                order: {
                    created_at: 'DESC'
                }
            });
            if (ongoingJobs.length > 0) {
                this.logger.log(`Sending ${ongoingJobs.length} ongoing jobs to user ${userId}`);
                ongoingJobs.forEach(job => {
                    this.emitToUser(userId, 'job-update', {
                        jobId: job.id.toString(),
                        progress: job.progress_percentage || 0,
                        status: job.status,
                        message: 'Devam ediyor...',
                        type: 'pdf',
                        timestamp: new Date().toISOString()
                    });
                });
            }
        }
        catch (error) {
            this.logger.error(`Failed to send ongoing jobs to user ${userId}:`, error);
        }
    }
};
exports.SocketGateway = SocketGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], SocketGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('message'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", String)
], SocketGateway.prototype, "handleMessage", null);
exports.SocketGateway = SocketGateway = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(shared_1.SessionEntity)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        typeorm_2.Repository])
], SocketGateway);
//# sourceMappingURL=socket.gateway.js.map