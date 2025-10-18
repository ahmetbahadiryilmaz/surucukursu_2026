// Default ports for services
export const DEFAULT_PORTS = {
  DB_PORT: 5432,
  REDIS_PORT: 6379,
  RABBITMQ_PORT: 5672,
  BACKEND_PORT: 3000,
  FRONTEND_PORT: 9011,
} as const;

// Timeouts and intervals
export const TIMEOUTS = {
  PORT_CHECK: 3000, // 3 seconds
  CPU_MEASURE_INTERVAL: 1000, // 1 second
} as const;

// File size units
export const FILE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;

// System measurement constants
export const BYTES_TO_KB = 1024;