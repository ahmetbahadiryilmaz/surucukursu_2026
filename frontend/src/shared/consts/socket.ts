// Socket Configuration Constants

const API_GATEWAY_PORT = import.meta.env.VITE_API_GATEWAY_PORT || '9501';

export const SOCKET_CONFIG = {
  // Base URLs for different environments
  DEVELOPMENT: `ws://localhost:${API_GATEWAY_PORT}`,
  STAGING: "wss://test.mtsk.app",
  PRODUCTION: "wss://staging.mtsk.app",

  // Default timeout
  TIMEOUT: 30000,

  // Connection options
  DEFAULT_OPTIONS: {
    transports: ['websocket', 'polling'],
    timeout: 30000,
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  }
} as const;

// Environment-based URL selection
export const getSocketBaseUrl = (): string => {
  const nodeEnv = import.meta.env.VITE_NODE_ENV || import.meta.env.NODE_ENV || 'development';
  console.log('🌍 Socket environment check:', { nodeEnv, prod: nodeEnv === "production", staging: nodeEnv === "staging" });
  
  if (nodeEnv === "production") {
    return import.meta.env.VITE_SOCKET_BASE_URL || SOCKET_CONFIG.PRODUCTION;
  }

  if (nodeEnv === "staging") {
    return import.meta.env.VITE_SOCKET_BASE_URL || SOCKET_CONFIG.STAGING;
  }

  return import.meta.env.VITE_SOCKET_BASE_URL || SOCKET_CONFIG.DEVELOPMENT;
};