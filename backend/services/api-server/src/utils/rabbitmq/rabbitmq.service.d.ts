interface RabbitMQConnection {
    connection: any;
    channel: any;
}
export declare class RabbitMQService {
    private readonly logger;
    connect(queueName: string): Promise<RabbitMQConnection>;
    sendMessage(queueName: string, message: any): Promise<void>;
    close(channel: any, connection: any): Promise<void>;
}
export {};
