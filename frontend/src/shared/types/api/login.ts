// Login API Request/Response Types

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    email: string;
    userType: any;
    drivingSchools?: Array<{
      id: number;
      name: string;
      address: string;
      phone: string;
      created_at: string;
      updated_at: string;
    }>;
    [key: string]: any;
  };
}

export interface LoginErrorResponse {
  message: string;
  statusCode: number;
  error?: string;
  field?: string;
}

// User data structure as stored in context/localStorage
export interface UserData {
  id: number;
  email: string;
  userType: number;
  date?: number;
  drivingSchools?: Array<{
    id: number;
    name: string;
    address: string;
    phone: string;
    created_at: string;
    updated_at: string;
  }>;
}
