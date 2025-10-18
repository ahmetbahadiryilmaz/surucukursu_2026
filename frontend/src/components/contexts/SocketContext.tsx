import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socketService } from '@/services/socket-service';
import { drivingSchoolOwnerContext } from '@/components/contexts/DrivingSchoolManagerContext';

interface SocketContextType {
  isConnected: boolean;
  isDisconnected: boolean;
  disconnectReason: 'network' | 'token_expired' | 'unknown' | null;
  helloMessage: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (data: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [disconnectReason, setDisconnectReason] = useState<'network' | 'token_expired' | 'unknown' | null>(null);
  const [helloMessage, setHelloMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user } = drivingSchoolOwnerContext();

  console.log('🎯 SocketProvider rendered, user:', user?.email, 'isConnected:', isConnected);

  console.log('🎯 SocketProvider rendered, user:', user?.email);

  // Handle hello message from socket
  const handleHelloMessage = useCallback((event: CustomEvent) => {
    const data = event.detail;
    console.log('🌟 Socket Hello Message Received:', data);
    // Extract just the message string from the data object
    setHelloMessage(data?.message || null);
  }, []);

  // Handle socket disconnection
  const handleSocketDisconnected = useCallback((event: CustomEvent) => {
    console.log('🔌 Socket disconnected event received:', event.detail);
    setIsConnected(false);
    setIsDisconnected(true);
    setDisconnectReason('network');
  }, []);

  // Handle socket reconnection
  const handleSocketConnected = useCallback(() => {
    console.log('🔌 Socket connected event received');
    setIsConnected(true);
    setIsDisconnected(false);
    setDisconnectReason(null);
  }, []);

  // Handle token expiration
  const handleTokenExpired = useCallback((event: CustomEvent) => {
    console.log('🔐 Token expired event received:', event.detail);
    setIsConnected(false);
    setIsDisconnected(true);
    setDisconnectReason('token_expired');

    // Show user-friendly message and handle logout
    setTimeout(() => {
      alert('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
      // Clear user data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('activeDrivingSchool');
      window.location.href = '/';
    }, 100);
  }, []);

  // Auto-connect when user is authenticated
  useEffect(() => {
    const shouldConnect = user && localStorage.getItem('token');

    if (shouldConnect && !isConnected && !isConnecting) {
      console.log('🔌 Auto-connecting to socket for user:', user.email);
      connect();
    } else if (!shouldConnect && isConnected) {
      console.log('🔌 Disconnecting socket - user logged out');
      disconnect();
    }
  }, [user, isConnected, isConnecting]);

  // Listen for hello messages and disconnection events
  useEffect(() => {
    window.addEventListener('socket-hello', handleHelloMessage as EventListener);
    window.addEventListener('socket-disconnected', handleSocketDisconnected as EventListener);
    window.addEventListener('socket-connected', handleSocketConnected as EventListener);
    window.addEventListener('socket-token-expired', handleTokenExpired as EventListener);

    return () => {
      window.removeEventListener('socket-hello', handleHelloMessage as EventListener);
      window.removeEventListener('socket-disconnected', handleSocketDisconnected as EventListener);
      window.removeEventListener('socket-connected', handleSocketConnected as EventListener);
      window.removeEventListener('socket-token-expired', handleTokenExpired as EventListener);
    };
  }, [handleHelloMessage, handleSocketDisconnected, handleSocketConnected, handleTokenExpired]);

  const connect = async () => {
    if (isConnecting) {
      console.log('🔄 Connection already in progress, skipping...');
      return;
    }

    try {
      console.log('🔌 Starting socket connection process...');
      setIsConnecting(true);
      await socketService.connect();
      setIsConnected(true);
      setIsDisconnected(false);
      console.log('✅ Socket connected successfully');
    } catch (error) {
      console.error('❌ Socket connection failed:', error);
      setIsConnected(false);
      setIsDisconnected(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    console.log('🔌 Disconnecting from Socket.IO server...');
    socketService.disconnect();
    setIsConnected(false);
    setIsDisconnected(true);
    setIsConnecting(false);
    setHelloMessage(null);
    console.log('✅ Socket disconnected');
  };

  const sendMessage = (data: any) => {
    if (isConnected) {
      console.log('📤 Sending socket message:', data);
      socketService.sendMessage(data);
    } else {
      console.warn('⚠️ Cannot send message - socket not connected');
    }
  };

  const value: SocketContextType = {
    isConnected,
    isDisconnected,
    disconnectReason,
    helloMessage,
    connect,
    disconnect,
    sendMessage,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};