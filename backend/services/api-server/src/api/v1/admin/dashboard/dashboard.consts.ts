export const DEFAULT_PORTS = {
  API_GATEWAY: 9501,
  API_SERVER: 9502,
  FILE_SERVER: 9504,
  MEBBIS_SERVICE: 9010,
  DESKTOP_SERVICE: 9506,
  FRONTEND: 5173,
  DB: 3306,
  RABBITMQ: 5672,
} as const;

export const TIMEOUTS = {
  PORT_CHECK: 3000,
  CPU_MEASURE_INTERVAL: 1000,
} as const;

export const FILE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;
export const BYTES_TO_KB = 1024;