import { io, Socket } from 'socket.io-client';
import { getSocketBaseUrl } from '../shared/consts/socket';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnecting = false;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        console.log('🔌 Socket already connected');
        resolve();
        return;
      }

      if (this.isConnecting) {
        console.log('🔄 Socket connection already in progress');
        resolve();
        return;
      }

      const token = localStorage.getItem('token');
      console.log('🔌 SocketService.connect called, token exists:', !!token);
      if (!token) {
        console.error('❌ No token found for socket connection');
        reject(new Error('No token found'));
        return;
      }

      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      let userId: string | null = null;
      if (userData) {
        try {
          const user = JSON.parse(userData);
          userId = user.id?.toString();
        } catch (error) {
          console.error('❌ Error parsing user data:', error);
        }
      }

      if (!userId) {
        console.error('❌ No user ID found for socket connection');
        reject(new Error('No user ID found'));
        return;
      }

      this.isConnecting = true;

      // Get socket URL from configuration
      const socketUrl = getSocketBaseUrl();
      console.log('🔌 Attempting to connect to:', socketUrl);

      // Connect to the backend Socket.IO server with query parameters
      this.socket = io(socketUrl, {
        query: {
          token: token,
          userId: userId
        },
        transports: ['websocket', 'polling']
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket.IO server connected successfully');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        // Emit custom event for successful connection
        window.dispatchEvent(new CustomEvent('socket-connected'));
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Socket.IO server disconnected:', reason);
        this.isConnecting = false;
        // Emit custom event for disconnection
        window.dispatchEvent(new CustomEvent('socket-disconnected', { detail: { reason } }));
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        this.reconnectAttempts++;
        this.isConnecting = false;

        // Check if it's a token/authentication error
        const isAuthError = this.isAuthenticationError(error);
        if (isAuthError) {
          console.log('🔐 Authentication error detected, emitting token-expired event');
          window.dispatchEvent(new CustomEvent('socket-token-expired', {
            detail: { error: error.message || 'Token expired or invalid' }
          }));
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });

      // Listen for auth_error events from server
      this.socket.on('auth_error', (error) => {
        console.error('🔐 Auth error from server:', error);
        this.isConnecting = false;
        
        // Emit token expired event to trigger logout
        window.dispatchEvent(new CustomEvent('socket-token-expired', {
          detail: { error: error.message || 'Authentication failed' }
        }));
        
        reject(new Error(error.message || 'Authentication failed'));
      });

      this.socket.on('message', (data) => {
        console.log('📨 Received message:', data);
        // Handle incoming messages
        this.handleMessage(data);
      });

      // Listen for hello message
      this.socket.on('hello', (data) => {
        console.log('👋 Received hello:', data);
        // You can emit a custom event or update state here
        window.dispatchEvent(new CustomEvent('socket-hello', { detail: data }));
      });

      // Listen for job update events
      this.socket.on('job-update', (data) => {
        console.log('📊 Socket received job-update:', data);
        console.log('🚀 Dispatching window event: job-update');
        window.dispatchEvent(new CustomEvent('job-update', { detail: data }));
        console.log('✅ Window event dispatched');
      });

      this.socket.on('pdf-completed', (data) => {
        console.log('✅ PDF Completed:', data);
        window.dispatchEvent(new CustomEvent('pdf-completed', { detail: data }));
      });

      this.socket.on('pdf-error', (data) => {
        console.log('❌ PDF Error:', data);
        window.dispatchEvent(new CustomEvent('pdf-error', { detail: data }));
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnecting = false;
  }

  sendMessage(data: any) {
    if (this.socket?.connected) {
      this.socket.emit('message', data);
    } else {
      console.warn('Socket not connected');
    }
  }

  private handleMessage(data: any) {
    // Handle different types of messages
    console.log('Handling message:', data);
  }

  private isAuthenticationError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString() || '';
    const errorData = error.data || {};

    // Check for common authentication error patterns
    const authErrorPatterns = [
      'token',
      'auth',
      'unauthorized',
      'forbidden',
      'expired',
      'invalid',
      'jwt',
      'authentication'
    ];

    const messageLower = errorMessage.toLowerCase();
    const dataMessage = (errorData.message || '').toLowerCase();

    return authErrorPatterns.some(pattern =>
      messageLower.includes(pattern) || dataMessage.includes(pattern)
    );
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();