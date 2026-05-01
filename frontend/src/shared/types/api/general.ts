// General API Types

export interface ErrorResponse {
  message?: string;
  status?: number;
  data?: any;
}

// Subscription interface
export interface Subscription {
  id: string | number;
  type: string;
  pdf_print_limit?: number | null;
  pdf_print_used: number;
  created_at: string;
  updated_at: string;
  ends_at?: string | null;
}

// Entity Types
export interface DrivingSchool {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  owner_id?: number | string;
  manager_id?: number | string;
  city_id?: number | string;
  district_id?: number | string;
  subscription_id?: number | string;
  subscription?: Subscription;
  [key: string]: any;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  userType: string;
  drivingSchools?: DrivingSchool[];
  [key: string]: any;
}

export interface Admin {
  id: string;
  email: string;
  username: string;
  [key: string]: any;
}

export interface DrivingSchoolManager {
  id: string;
  email: string;
  username: string;
  drivingSchoolId: string;
  [key: string]: any;
}

export interface DrivingSchoolOwner {
  id: string;
  email: string;
  username: string;
  drivingSchools: DrivingSchool[];
  [key: string]: any;
}

export interface Student {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  drivingSchoolId: string;
  [key: string]: any;
}

export interface Car {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  drivingSchoolId: string;
  [key: string]: any;
}

export interface Credentials {
  id: string;
  username: string;
  password: string;
  drivingSchoolId: string;
  [key: string]: any;
}
