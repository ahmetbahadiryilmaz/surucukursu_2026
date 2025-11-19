import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MebbisGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: any): string {
    return `Received: ${data}`;
  }

  @SubscribeMessage('notiflogin')
  handleNotifLogin(@MessageBody() data: any): string {
    return `Login notification: ${data}`;
  }
}
