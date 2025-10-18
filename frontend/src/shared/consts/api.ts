// API Configuration Constants

export const API_CONFIG = {
  // Base URLs for different environments
  DEVELOPMENT: "http://localhost:3001/api/v1",
  STAGING: "https://test.mtsk.app/api/v1", 
  PRODUCTION: "https://staging.mtsk.app/api/v1",
  
  // Default timeout
  TIMEOUT: 30000,
  
  // Default headers
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
  }
} as const;

// Environment-based URL selection
export const getApiBaseUrl = (): string => {
  if (process.env.NODE_ENV === "production") {
    return process.env.REACT_APP_API_BASE_URL || API_CONFIG.PRODUCTION;
  }
  
  if (process.env.NODE_ENV === "staging") {
    return process.env.REACT_APP_API_BASE_URL || API_CONFIG.STAGING;
  }
  
  return process.env.REACT_APP_API_BASE_URL || API_CONFIG.DEVELOPMENT;
};
