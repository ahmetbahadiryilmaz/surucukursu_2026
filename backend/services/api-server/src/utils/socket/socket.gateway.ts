import {
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionEntity, JobEntity, JobStatus } from '@surucukursu/shared';
import { socketConfig } from '@surucukursu/shared';

@Injectable()
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('SocketGateway');

  constructor(
    private jwtService: JwtService,
    @InjectRepository(SessionEntity)
    private sessionRepository: Repository<SessionEntity>,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Socket.IO server initialized');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    try {
      // Get token and userId from query parameters only (more secure for initial connection)
      const token = client.handshake.query.token as string;
      const userId = client.handshake.query.userId as string;

      // Validate required parameters
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

      // Verify JWT token
      let payload;
      try {
        payload = this.jwtService.verify(token);
      } catch (jwtError) {
        this.logger.error(`JWT verification failed for client ${client.id}: ${jwtError.message}`);
        client.emit('auth_error', {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          shouldReconnect: false
        });
        client.disconnect(true);
        return;
      }

      // Verify userId matches token payload
      if (payload.id?.toString() !== userId?.toString()) {
        this.logger.error(`User ID mismatch for client ${client.id}. Expected: ${payload.id}, Got: ${userId}`);
        client.emit('auth_error', {
          code: 'USER_ID_MISMATCH',
          message: 'User ID does not match token',
          shouldReconnect: false
        });
        client.disconnect(true);
        return;
      }
      
      // Check if session exists and is valid
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

      // Store user info in socket
      client.data.user = payload;
      client.data.userId = userId;

      // Update last activity
      await this.sessionRepository.update(session.id, { 
        last_activity: Math.floor(Date.now() / 1000) 
      });

      // Send hello message to the connected client
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

      // Send ongoing jobs for this user
      await this.sendOngoingJobsToUser(payload.id);

      this.logger.log(`Client connected: ${client.id} (User: ${payload.id})`);
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.emit('auth_error', {
        code: 'AUTH_FAILED',
        message: 'Authentication failed',
        shouldReconnect: false
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(
    @MessageBody() data: any,
    @ConnectedSocket() client: Socket,
  ): string {
    this.logger.log(`Message received from ${client.id}: ${JSON.stringify(data)}`);

    // Handle hello messages from frontend
    if (data.type === 'hello' && data.content) {
      const user = client.data.user;
      if (user) {
        const helloResponse = `Hello ${user.email}! Welcome to the system.`;
        this.logger.log(`Sending hello response to ${client.id}: ${helloResponse}`);

        // Emit response back to the specific client
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

  // Method to emit events to all connected clients
  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Method to emit events to specific room
  emitToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, data);
  }

  // Method to emit events to authenticated users only
  emitToAuthenticatedUsers(event: string, data: any) {
    this.server.sockets.sockets.forEach((socket) => {
      if (socket.data.user) {
        socket.emit(event, data);
      }
    });
  }

  // Method to emit events to specific user
  emitToUser(userId: number, event: string, data: any) {
    this.server.sockets.sockets.forEach((socket) => {
      if (socket.data.userId == userId.toString()) {
        socket.emit(event, data);
      }
    });
  }

  // PDF Progress methods
  emitPdfProgress(jobId: string, progressData: any) {
    this.logger.debug(`Emitting PDF progress for job ${jobId}: ${progressData.progress}%`);
    this.emitToAuthenticatedUsers('job-update', {
      jobId,
      ...progressData,
      timestamp: new Date().toISOString()
    });
  }

  emitPdfCompleted(jobId: string, result: any) {
    this.logger.log(`Emitting PDF completion for job ${jobId}`);
    this.emitToAuthenticatedUsers('pdf-completed', {
      jobId,
      result,
      timestamp: new Date().toISOString()
    });
  }

  emitPdfError(jobId: string, error: string) {
    this.logger.error(`Emitting PDF error for job ${jobId}: ${error}`);
    this.emitToAuthenticatedUsers('pdf-error', {
      jobId,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // Send ongoing jobs to a specific user when they reconnect
  async sendOngoingJobsToUser(userId: number) {
    try {
      // Query for ongoing jobs (processing status)
      const ongoingJobs = await this.sessionRepository.manager.find(JobEntity, {
        where: {
          status: JobStatus.PROCESSING
        },
        order: {
          created_at: 'DESC'
        }
      });

      if (ongoingJobs.length > 0) {
        this.logger.log(`Sending ${ongoingJobs.length} ongoing jobs to user ${userId}`);
        
        // Send each ongoing job to the user with progress data
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
    } catch (error) {
      this.logger.error(`Failed to send ongoing jobs to user ${userId}:`, error);
    }
  }
}