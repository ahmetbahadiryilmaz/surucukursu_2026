import { useEffect, useState } from 'react';
import { socketService } from '@/services/socket-service';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [helloMessage, setHelloMessage] = useState<string | null>(null);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        await socketService.connect();
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect to socket:', error);
        setIsConnected(false);
      }
    };

    connectSocket();

    // Listen for hello messages
    const handleHello = (event: CustomEvent) => {
      setHelloMessage(event.detail);
    };

    window.addEventListener('socket-hello', handleHello as EventListener);

    return () => {
      window.removeEventListener('socket-hello', handleHello as EventListener);
      socketService.disconnect();
    };
  }, []);

  const sendMessage = (data: any) => {
    socketService.sendMessage(data);
  };

  return {
    isConnected,
    helloMessage,
    sendMessage,
  };
};