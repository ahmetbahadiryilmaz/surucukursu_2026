import { Injectable, Logger } from '@nestjs/common';
import * as amqp from 'amqplib';
import { env } from '@surucukursu/shared';

interface RabbitMQConnection {
    connection: any;
    channel: any;
}

@Injectable()
export class RabbitMQService {
    private readonly logger = new Logger(RabbitMQService.name);

    /**
     * Connect to RabbitMQ and return connection and channel
     */
    async connect(queueName: string): Promise<RabbitMQConnection> {
        try {
            const { host, port, user, password } = env.rabbitmq;
            const vhost = process.env.RABBITMQ_VHOST || '/';
            const connectionString = `amqp://${user}:${password}@${host}:${port}/${vhost}`;

            this.logger.log(`Connecting to RabbitMQ at ${host}:${port} (vhost: ${vhost})`);
            
            const connection = await amqp.connect(connectionString);
            const channel = await connection.createChannel();

            // Ensure queue exists
            await channel.assertQueue(queueName, { durable: true });
            
            this.logger.log(`Connected to RabbitMQ successfully on vhost: ${vhost}`);
            
            return { connection, channel };
        } catch (error) {
            this.logger.error('Failed to connect to RabbitMQ:', error);
            throw error;
        }
    }

    /**
     * Send a message to the queue
     */
    async sendMessage(queueName: string, message: any): Promise<void> {
        let connection: any = null;
        let channel: any = null;
        
        try {
            // Connect
            const rabbitMQ = await this.connect(queueName);
            connection = rabbitMQ.connection;
            channel = rabbitMQ.channel;

            // Send message
            const messageBuffer = Buffer.from(JSON.stringify(message));
            this.logger.log(`Sending message to queue '${queueName}': ${JSON.stringify(message)}`);
            const sent = await channel.sendToQueue(queueName, messageBuffer, {
                persistent: true,
            });
            
            this.logger.log(`Message sent to queue '${queueName}': ${message.id || 'unknown'} - Success: ${sent}`);
            
            // Check queue status
            const queueStatus = await channel.checkQueue(queueName);
            this.logger.log(`Queue '${queueName}' status: ${JSON.stringify(queueStatus)}`);
        } catch (error) {
            this.logger.error('Failed to send message to queue:', error);
            throw error;
        } finally {
            // Always close connection after sending
            await this.close(channel, connection);
        }
    }

    /**
     * Close channel and connection
     */
    async close(channel: any, connection: any): Promise<void> {
        try {
            if (channel) {
                await channel.close();
                this.logger.debug('RabbitMQ channel closed');
            }
            if (connection) {
                await connection.close();
                this.logger.debug('RabbitMQ connection closed');
            }
        } catch (error) {
            this.logger.warn('Error closing RabbitMQ connection:', error);
        }
    }
}
