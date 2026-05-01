// Logout API Request/Response Types

export interface LogoutRequest {
  // Usually just requires token in headers
}

export interface LogoutResponse {
  message: string;
  success: boolean;
}

export interface LogoutErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
}
