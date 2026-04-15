"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var RabbitMQService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RabbitMQService = void 0;
const common_1 = require("@nestjs/common");
const amqp = require("amqplib");
const shared_1 = require("../../../../../shared/src");
let RabbitMQService = RabbitMQService_1 = class RabbitMQService {
    constructor() {
        this.logger = new common_1.Logger(RabbitMQService_1.name);
    }
    async connect(queueName) {
        try {
            const { host, port, user, password } = shared_1.env.rabbitmq;
            const vhost = process.env.RABBITMQ_VHOST || '/';
            const connectionString = `amqp://${user}:${password}@${host}:${port}/${vhost}`;
            this.logger.log(`Connecting to RabbitMQ at ${host}:${port} (vhost: ${vhost})`);
            const connection = await amqp.connect(connectionString);
            const channel = await connection.createChannel();
            await channel.assertQueue(queueName, { durable: true });
            this.logger.log(`Connected to RabbitMQ successfully on vhost: ${vhost}`);
            return { connection, channel };
        }
        catch (error) {
            this.logger.error('Failed to connect to RabbitMQ:', error);
            throw error;
        }
    }
    async sendMessage(queueName, message) {
        let connection = null;
        let channel = null;
        try {
            const rabbitMQ = await this.connect(queueName);
            connection = rabbitMQ.connection;
            channel = rabbitMQ.channel;
            const messageBuffer = Buffer.from(JSON.stringify(message));
            this.logger.log(`Sending message to queue '${queueName}': ${JSON.stringify(message)}`);
            const sent = await channel.sendToQueue(queueName, messageBuffer, {
                persistent: true,
            });
            this.logger.log(`Message sent to queue '${queueName}': ${message.id || 'unknown'} - Success: ${sent}`);
            const queueStatus = await channel.checkQueue(queueName);
            this.logger.log(`Queue '${queueName}' status: ${JSON.stringify(queueStatus)}`);
        }
        catch (error) {
            this.logger.error('Failed to send message to queue:', error);
            throw error;
        }
        finally {
            await this.close(channel, connection);
        }
    }
    async close(channel, connection) {
        try {
            if (channel) {
                await channel.close();
                this.logger.debug('RabbitMQ channel closed');
            }
            if (connection) {
                await connection.close();
                this.logger.debug('RabbitMQ connection closed');
            }
        }
        catch (error) {
            this.logger.warn('Error closing RabbitMQ connection:', error);
        }
    }
};
exports.RabbitMQService = RabbitMQService;
exports.RabbitMQService = RabbitMQService = RabbitMQService_1 = __decorate([
    (0, common_1.Injectable)()
], RabbitMQService);
//# sourceMappingURL=rabbitmq.service.js.map