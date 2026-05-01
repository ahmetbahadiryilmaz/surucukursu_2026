import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { CarSyncService } from './car-sync.service';

interface SyncCarJobMessage {
  jobId: number;
  schoolId: number;
  mebbisUsername: string;
  mebbisPassword: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private readonly QUEUE_NAME = 'sync_cars_queue';
  private readonly EXCHANGE_NAME = 'surucukursu';

  constructor(private readonly carSyncService: CarSyncService) {}

  async onModuleInit() {
    await this.connect();
  }

  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Declare exchange and queue
      await this.channel.assertExchange(this.EXCHANGE_NAME, 'direct', { durable: true });
      await this.channel.assertQueue(this.QUEUE_NAME, { durable: true });
      await this.channel.bindQueue(this.QUEUE_NAME, this.EXCHANGE_NAME, 'sync_cars');

      // Start consuming messages
      await this.consumeMessages();

      this.logger.log(`✅ Connected to RabbitMQ. Listening on queue: ${this.QUEUE_NAME}`);
    } catch (error) {
      this.logger.error('❌ Failed to connect to RabbitMQ:', error);
      setTimeout(() => this.connect(), 5000); // Retry after 5 seconds
    }
  }

  private async consumeMessages(): Promise<void> {
    await this.channel.consume(this.QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const message: SyncCarJobMessage = JSON.parse(msg.content.toString());
        this.logger.log(`📩 Received job: ${message.jobId} for school: ${message.schoolId}`);

        // Process the job
        await this.carSyncService.processSync(message);

        // Acknowledge the message
        this.channel.ack(msg);
        this.logger.log(`✅ Job ${message.jobId} completed and acknowledged`);
      } catch (error) {
        this.logger.error(`❌ Error processing message:`, error);
        // Nack and requeue
        this.channel.nack(msg, false, true);
      }
    });
  }

  async publishMessage(message: SyncCarJobMessage): Promise<void> {
    try {
      this.channel.publish(
        this.EXCHANGE_NAME,
        'sync_cars',
        Buffer.from(JSON.stringify(message)),
        { persistent: true },
      );
      this.logger.log(`📤 Published job: ${message.jobId}`);
    } catch (error) {
      this.logger.error('❌ Failed to publish message:', error);
    }
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
    this.logger.log('Disconnected from RabbitMQ');
  }
}
