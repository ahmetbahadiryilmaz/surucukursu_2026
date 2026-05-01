/**
 * API response types for Kurslar (Driving Schools) module
 */

// ===== BASE API TYPES =====

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ===== ENTITY API TYPES =====

/**
 * Driving school owner API response
 */
export interface OwnerApiResponse {
  id: string | number;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Driving school manager API response
 */
export interface ManagerApiResponse {
  id: string | number;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * City API response
 */
export interface CityApiResponse {
  id: string | number;
  name: string;
  districts?: DistrictApiResponse[];
}

/**
 * District API response
 */
export interface DistrictApiResponse {
  id: string | number;
  name: string;
  city_id: number;
}

/**
 * Subscription API response
 */
export interface SubscriptionApiResponse {
  id: string | number;
  type: string;
  pdf_print_limit?: number | null;
  pdf_print_used: number;
  created_at: string;
  updated_at: string;
  ends_at?: string | null;
}

/**
 * Driving school API response
 */
export interface DrivingSchoolApiResponse {
  id: string | number;
  name: string;
  address: string;
  phone: string;
  owner_id: string | number;
  manager_id: string | number;
  city_id?: number | null;
  district_id?: number | null;
  status?: string;
  owner?: OwnerApiResponse;
  manager?: ManagerApiResponse;
  city?: CityApiResponse;
  district?: DistrictApiResponse;
  subscription?: SubscriptionApiResponse;
  created_at?: string;
  updated_at?: string;
}

// ===== CREATE/UPDATE REQUEST TYPES =====

/**
 * Create driving school request payload
 */
export interface CreateDrivingSchoolRequest {
  name: string;
  address: string;
  phone: string;
  owner_id: number;
  manager_id: number;
  city_id?: number | null;
  district_id?: number | null;
}

/**
 * Update driving school request payload
 */
export interface UpdateDrivingSchoolRequest {
  name?: string;
  address?: string;
  phone?: string;
  owner_id?: number;
  manager_id?: number;
  city_id?: number | null;
  district_id?: number | null;
}

// ===== LIST RESPONSE TYPES =====

/**
 * List driving schools API response
 */
export type DrivingSchoolsListResponse = ApiResponse<DrivingSchoolApiResponse[]>;

/**
 * List owners API response
 */
export type OwnersListResponse = ApiResponse<OwnerApiResponse[]>;

/**
 * List managers API response
 */
export type ManagersListResponse = ApiResponse<ManagerApiResponse[]>;

/**
 * List cities API response
 */
export type CitiesListResponse = ApiResponse<CityApiResponse[]>;

/**
 * List districts API response
 */
export type DistrictsListResponse = ApiResponse<DistrictApiResponse[]>;

// ===== SINGLE ENTITY RESPONSE TYPES =====

/**
 * Single driving school API response
 */
export type DrivingSchoolResponse = ApiResponse<DrivingSchoolApiResponse>;

/**
 * Single owner API response
 */
export type OwnerResponse = ApiResponse<OwnerApiResponse>;

/**
 * Single manager API response
 */
export type ManagerResponse = ApiResponse<ManagerApiResponse>;

/**
 * Single city API response
 */
export type CityResponse = ApiResponse<CityApiResponse>;

/**
 * Single district API response
 */
export type DistrictResponse = ApiResponse<DistrictApiResponse>;
