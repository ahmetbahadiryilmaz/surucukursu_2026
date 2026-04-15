import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { SessionEntity } from '@surucukursu/shared';
export declare class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    private sessionRepository;
    server: Server;
    private logger;
    constructor(jwtService: JwtService, sessionRepository: Repository<SessionEntity>);
    afterInit(server: Server): void;
    handleConnection(client: Socket, ...args: any[]): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleMessage(data: any, client: Socket): string;
    emitToAll(event: string, data: any): void;
    emitToRoom(room: string, event: string, data: any): void;
    emitToAuthenticatedUsers(event: string, data: any): void;
    emitToUser(userId: number, event: string, data: any): void;
    emitPdfProgress(jobId: string, progressData: any): void;
    emitPdfCompleted(jobId: string, result: any): void;
    emitPdfError(jobId: string, error: string): void;
    sendOngoingJobsToUser(userId: number): Promise<void>;
}
