import { Injectable, Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

@Injectable()
export class SocketService {
  private readonly logger = new Logger(SocketService.name);
  private socket: Socket;

  constructor() {
    this.initializeSocket();
  }

  private initializeSocket(): void {
    const apiServerUrl = process.env.API_SERVER_URL || 'http://localhost:3001';
    
    this.socket = io(apiServerUrl, {
      auth: {
        token: process.env.WORKER_TOKEN || 'worker-secret-token',
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      this.logger.log('✅ Connected to API Server via Socket.IO');
    });

    this.socket.on('disconnect', () => {
      this.logger.warn('⚠️  Disconnected from API Server');
    });

    this.socket.on('connect_error', (error) => {
      this.logger.error('❌ Socket connection error:', error);
    });
  }

  emit(event: string, data: any): void {
    if (this.socket.connected) {
      this.socket.emit(event, data);
      this.logger.debug(`📤 Emitted event: ${event}`);
    } else {
      this.logger.warn(`⚠️  Socket not connected. Cannot emit event: ${event}`);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.logger.log('Disconnected from Socket.IO');
    }
  }
}
