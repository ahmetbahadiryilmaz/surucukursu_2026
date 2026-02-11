import { toast } from "react-toastify";
import { AxiosService } from "../lib/axios";
import { API_CONFIG } from "../shared/consts/api";
import type { 
  LoginResponse, 
  DrivingSchool
} from "../shared/types/api";
import type { 
  SystemInfoResponse, 
  DashboardResponse 
} from "../types/system.types";

/**
 * Centralized API Service
 * 
 * This service provides a unified interface for all backend API calls.
 * All API communication should go through this service to ensure consistency,
 * proper error handling, and centralized token management.
 * 
 * Available Endpoints:
 * 
 * AUTHENTICATION:
 * - authentication.login(email, password)
 * - authentication.register(email, username, password)
 * - authentication.resetPassword(email)
 * - authentication.logout()
 * 
 * USER MANAGEMENT:
 * - user.getProfile()
 * - user.updateProfile(data)
 * - user.getUserInfo()
 * - user.me()
 * 
 * DRIVING SCHOOL OPERATIONS:
 * - drivingSchool.getSchoolInfo(code)
 * - drivingSchool.getStudents(code)
 * - drivingSchool.getCars(code)
 * - drivingSchool.getCredentials(code)
 * - drivingSchool.updateCredentials(code, data)
 * - drivingSchool.getDashboard(code)
 * - drivingSchool.getSettings(id)
 * - drivingSchool.updateSettings(id, data)
 * 
 * ADMIN OPERATIONS:
 * - admin.getAdmins(), createAdmin(data), getAdminById(id), updateAdmin(id, data), deleteAdmin(id)
 * - admin.getDrivingSchools(), createDrivingSchool(data), getDrivingSchoolById(id), etc.
 * - admin.getDrivingSchoolManagers(), createDrivingSchoolManager(data), etc.
 * - admin.getDrivingSchoolOwners(), createDrivingSchoolOwner(data), etc.
 * - admin.getDashboard(), getDashboardData(schoolCode?), getSystemInfo()
 * - admin.getSystemLogs(query)
 * - admin.loginAsDrivingSchoolManager(id)
 * - admin.getCities(), getDistrictsByCity(cityId)
 * 
 * Usage Example:
 * import { apiService } from '@/services/api-service';
 * const dashboard = await apiService.drivingSchool.getDashboard(schoolCode);
 * const admins = await apiService.admin.getAdmins();
 */

class ApiService {
  private static instance: ApiService;
  private axiosService: AxiosService;
  private fileAxiosService: AxiosService; // Separate axios instance for file service
  private readonly API_BASE_URL: string;
  private readonly FILE_BASE_URL: string;

  private constructor() {
    // Determine API base URL based on environment/domain
    this.API_BASE_URL = this.getApiBaseUrl();
    this.FILE_BASE_URL = this.getFileBaseUrl();
    
    // Initialize axios service with project-specific base URL
    this.axiosService = AxiosService.getInstance(this.API_BASE_URL);
    
    // Initialize separate axios service for file server (without /api/v1)
    this.fileAxiosService = new (AxiosService as any)(this.FILE_BASE_URL);
    
    // Set up unauthorized handler and initial token for both services
    this.axiosService.setUnauthorizedHandler(() => this.handleUnauthorized());
    this.fileAxiosService.setUnauthorizedHandler(() => this.handleUnauthorized());
    
    // Set initial token if it exists
    const token = this.getToken();
    if (token) {
      this.axiosService.setToken(token);
      this.fileAxiosService.setToken(token);
    }
  }

  // Determine API base URL based on domain
  private getApiBaseUrl(): string {
    // Use environment variable if available, otherwise fall back to domain-based logic
    const envApiUrl = import.meta.env.VITE_API_URL;
    if (envApiUrl) {
      return envApiUrl;
    }

    const hostname = window.location.hostname;
    
    // If local development
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
      return API_CONFIG.DEVELOPMENT;
    }
    
    // If domain contains 'test ekullanici' (staging)
    if (hostname.includes('test') && hostname.includes('ekullanici')) {
      return API_CONFIG.STAGING;
    }
    
    // Default to production
    return API_CONFIG.PRODUCTION;
  }

  // Determine File server base URL (without /api/v1)
  private getFileBaseUrl(): string {
    const hostname = window.location.hostname;
    const API_GATEWAY_PORT = import.meta.env.VITE_API_GATEWAY_PORT || '9501';
    
    // If local development
    if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
      return `http://localhost:${API_GATEWAY_PORT}`;
    }
    
    // If domain contains 'test ekullanici' (staging)
    if (hostname.includes('test') && hostname.includes('ekullanici')) {
      return 'https://test.mtsk.app';
    }
    
    // Default to production
    return 'https://staging.mtsk.app';
  }

  // Singleton pattern
  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }
 

  // Authentication methods
  authentication = {
    login: async (email: string, password: string): Promise<LoginResponse> => {
      this.disableToast();
      const response = await this.axiosService.post<LoginResponse>("/auth/login", { email, password });
      this.enableToast();
      if (response.data.token && response.data.user) {
        // Store token and user data using centralized methods
        this.setToken(response.data.token);
        this.setUser(response.data.user);
        console.log("Login successful, localStorage updated");
      } else {
        console.error("Token veya kullanıcı bilgisi alınamadı.");
      }
      
      return response.data;
    },

    register: async (email: string, username: string, password: string): Promise<any> => {
      const response = await this.axiosService.post("/auth/register", {
        email,
        username,
        password,
      });
      
      return response.data;
    },

    resetPassword: async (email: string): Promise<any> => {
      const response = await this.axiosService.post("/auth/reset-password", { email });
      return response.data;
    },

    logout: async (): Promise<void> => {
      this.clearLocalStorage();
      await this.axiosService.post("/auth/logout");
    }
  };

  // User methods
  user = {
    // Get current user profile
    getProfile: async (): Promise<any> => {
      const response = await this.axiosService.get("/user/profile");
      return response.data;
    },

    // Update user profile
    updateProfile: async (data: { username?: string, email?: string, password?: string }): Promise<any> => {
      const response = await this.axiosService.put("/user/profile", data);
      return response.data;
    },

    // Get user info (legacy method - keeping for compatibility)
    getUserInfo: async (): Promise<any> => {
      const response = await this.axiosService.get("/user");
      return response.data;
    },

    // Get current user info via auth endpoint
    me: async (): Promise<any> => {
      const response = await this.axiosService.get("/auth/me");
      if (response.status == 401) {
        await this.authentication.logout();
        window.location.href = "/";
      }
      return response.data;
    }
  };

  // Legacy methods (keeping for backward compatibility)
  public async getUserInfo(): Promise<any> {
    return this.user.getUserInfo();
  }

  public async updateProfile(username: string, email: string, password: string): Promise<any> {
    return this.user.updateProfile({ username, email, password });
  }

  public async me() {
    return this.user.me();
  }

  // Driving School methods
  drivingSchool = {
    // Sürücü okulu bilgilerini getir
    getSchoolInfo: async (code: string): Promise<any> => {
      const response = await this.axiosService.get(`/driving-school/${code}/info`);
      return response.data;
    },

    // Öğrencileri getir
    getStudents: async (code: string): Promise<any> => {
      const response = await this.axiosService.get(`/driving-school/${code}/students`);
      return response.data;
    },

    // Araçları getir
    getCars: async (code: string): Promise<any> => {
      const response = await this.axiosService.get(`/driving-school/${code}/cars`);
      return response.data;
    },

    // Araçları MEBBIS'ten senkronize et
    syncCars: async (code: string, options?: { ajandasKodu?: string }): Promise<any> => {
      const response = await this.axiosService.post(`/driving-school/${code}/cars/sync`, {
        ajandasKodu: options?.ajandasKodu,
      });
      return response.data;
    },

    // Kimlik bilgilerini getir
    getCredentials: async (code: string): Promise<any> => {
      const response = await this.axiosService.get(`/driving-school/${code}/creds`);
      return response.data;
    },

    // Kimlik bilgilerini güncelle
    updateCredentials: async (code: string, data: any): Promise<any> => {
      const response = await this.axiosService.post(`/driving-school/${code}/creds`, data);
      return response.data;
    },

    // MEBBIS kimlik bilgilerini güncelle
    updateMebbisCredentials: async (code: string, username: string, password: string): Promise<any> => {
      const response = await this.axiosService.post(`/driving-school/${code}/creds`, {
        mebbis_username: username,
        mebbis_password: password,
      });
      return response.data;
    },

    // Dashboard verilerini getir
    getDashboard: async (code: string): Promise<any> => {
      const response = await this.axiosService.get(`/driving-school/${code}/dashboard`);
      return response.data;
    },

    // Get driving school settings
    getSettings: async (id: string): Promise<any> => {
      const response = await this.axiosService.get(`/driving-school/${id}/settings`);
      return response.data;
    },

    // Update driving school settings
    updateSettings: async (id: string, data: any): Promise<any> => {
      const response = await this.axiosService.put(`/driving-school/${id}/settings`, data);
      return response.data;
    }
  };

  // PDF methods
  pdf = {
    // Generate single PDF
    generateSingle: async (code: string, data: { jobType: string; studentId: number; template?: string; data?: any }): Promise<any> => {
      const response = await this.axiosService.post(`/driving-school/${code}/pdf/generate/single`, data);
      return response.data;
    },

    // Generate group PDF
    generateGroup: async (code: string, data: { jobType: string; studentIds: number[]; template?: string; data?: any[] }): Promise<any> => {
      const response = await this.axiosService.post(`/driving-school/${code}/pdf/generate/group`, data);
      return response.data;
    }
  };

  // Files management
  files = {
    // Get list of files for a driving school
    getFiles: async (code: string): Promise<{ success: boolean; drivingSchoolId: string; files: any[] }> => {
      console.log(`\n🔵 FRONTEND: Calling getFiles for driving school: ${code}`);
      console.log(`   Base URL: ${this.FILE_BASE_URL}`);
      console.log(`   Request URL: /files/driving-school/${code}`);
      console.log(`   Full URL: ${this.FILE_BASE_URL}/files/driving-school/${code}`);
      
      // Use file axios service (no /api/v1 prefix)
      const response = await this.fileAxiosService.get(`/files/driving-school/${code}`);
      
      console.log(`   ✅ Response received:`, response.data);
      return response.data;
    },

    // Download a specific file
    downloadFile: async (code: string, filename: string): Promise<Blob> => {
      console.log(`\n🔵 FRONTEND: Downloading file ${filename} for driving school: ${code}`);
      console.log(`   Full URL: ${this.FILE_BASE_URL}/files/driving-school/${code}/download/${filename}`);
      
      // Use file axios service (no /api/v1 prefix)
      const response = await this.fileAxiosService.get(`/files/driving-school/${code}/download/${filename}`, {
        responseType: 'blob'
      });
      return response.data;
    },

    // View PDF file inline (for preview in browser)
    viewFile: async (code: string, filename: string): Promise<string> => {
      // Return the URL for viewing the PDF inline
      return `${this.FILE_BASE_URL}/files/driving-school/${code}/view/${filename}`;
    },

    // Get file information
    getFileInfo: async (code: string, filename: string): Promise<any> => {
      console.log(`\n🔵 FRONTEND: Getting file info for ${filename} in driving school: ${code}`);
      
      // Use file axios service (no /api/v1 prefix)
      const response = await this.fileAxiosService.get(`/files/driving-school/${code}/info/${filename}`);
      return response.data;
    },

    // Get storage information
    getStorageInfo: async (code: string): Promise<any> => {
      const response = await this.fileAxiosService.get(`/files/driving-school/${code}/storage`);
      return response.data;
    },

    // Delete a single file
    deleteFile: async (code: string, filename: string): Promise<any> => {
      const response = await this.fileAxiosService.delete(`/files/driving-school/${code}/delete/${filename}`);
      return response.data;
    },

    // Delete all files
    deleteAllFiles: async (code: string): Promise<any> => {
      const response = await this.fileAxiosService.delete(`/files/driving-school/${code}/delete-all`);
      return response.data;
    },
  };

  // Admin methods
  admin = {
    // Admins Endpoints
    getAdmins: async (): Promise<any[]> => {
      const response = await this.axiosService.get("/admin/admins");
      return response.data;
    },

    createAdmin: async (data: any): Promise<any> => {
      const response = await this.axiosService.post("/admin/admins", data);
      return response.data;
    },

    getAdminById: async (id: string): Promise<any> => {
      const response = await this.axiosService.get(`/admin/admins/${id}`);
      return response.data;
    },

    updateAdmin: async (id: string, data: any): Promise<any> => {
      const response = await this.axiosService.put(`/admin/admins/${id}`, data);
      return response.data;
    },

    deleteAdmin: async (id: string): Promise<any> => {
      const response = await this.axiosService.delete(`/admin/admins/${id}`);
      return response.data;
    },

    // Driving Schools Endpoints
    getDrivingSchools: async (): Promise<DrivingSchool[]> => {
      const response = await this.axiosService.get("/admin/driving-schools");
      return response.data;
    },

    createDrivingSchool: async (data: any): Promise<any> => {
      // API'nin beklediği veri yapısını oluşturalım - subscription dahil
      const requestData = {
        name: data.name,
        address: data.address,
        phone: data.phone,
        owner_id: data.owner_id,
        manager_id: data.manager_id,
        city_id: data.city_id,
        district_id: data.district_id,
        subscription: data.subscription
      };
      
      console.log("Sürücü kursu oluşturma verileri:", requestData);
      
      const response = await this.axiosService.post("/admin/driving-schools", requestData);
      
      console.log("Kurs başarıyla oluşturuldu, yanıt:", response.data);
      return response.data;
    },

    getDrivingSchoolById: async (id: string): Promise<any> => {
      const response = await this.axiosService.get(`/admin/driving-schools/${id}`);
      return response.data;
    },

    updateDrivingSchool: async (id: string, data: any): Promise<any> => {
      console.log(`Updating driving school with ID: ${id}`);
      console.log("Data to be sent:", data);
      
      const requestData = {
        name: data.name,
        address: data.address,
        phone: data.phone,
        owner_id: data.owner_id,
        manager_id: data.manager_id,
        city_id: data.city_id,
        district_id: data.district_id,
        subscription: data.subscription
      };
      
      const response = await this.axiosService.put(`/admin/driving-schools/${id}`, requestData);
      console.log("Update successful, response:", response.data);
      
      return response.data;
    },

    deleteDrivingSchool: async (id: string): Promise<any> => {
      const response = await this.axiosService.delete(`/admin/driving-schools/${id}`);
      return response.data;
    },

    loginAsDrivingSchoolManager: async (id: string): Promise<any> => {
      const response = await this.axiosService.post(`/admin/driving-schools/${id}/login-as`);
      return response.data;
    },

    // Driving School Managers Endpoints
    getDrivingSchoolManagers: async (): Promise<any[]> => {
      const response = await this.axiosService.get("/admin/driving-school-managers");
      return response.data;
    },

    createDrivingSchoolManager: async (data: any): Promise<any> => {
      const response = await this.axiosService.post("/admin/driving-school-managers", data);
      return response.data;
    },

    getDrivingSchoolManagerById: async (id: string): Promise<any> => {
      const response = await this.axiosService.get(`/admin/driving-school-managers/${id}`);
      return response.data;
    },

    updateDrivingSchoolManager: async (id: string, data: any): Promise<any> => {
      const response = await this.axiosService.put(`/admin/driving-school-managers/${id}`, data);
      return response.data;
    },

    deleteDrivingSchoolManager: async (id: string): Promise<any> => {
      const response = await this.axiosService.delete(`/admin/driving-school-managers/${id}`);
      return response.data;
    },

    // Driving School Owners Endpoints
    getDrivingSchoolOwners: async (): Promise<any[]> => {
      const response = await this.axiosService.get("/admin/driving-school-owners");
      return response.data;
    },

    createDrivingSchoolOwner: async (data: any): Promise<any> => {
      const response = await this.axiosService.post("/admin/driving-school-owners", data);
      return response.data;
    },

    getDrivingSchoolOwnerById: async (id: string): Promise<any> => {
      const response = await this.axiosService.get(`/admin/driving-school-owners/${id}`);
      return response.data;
    },

    updateDrivingSchoolOwner: async (id: string, data: any): Promise<any> => {
      const response = await this.axiosService.put(`/admin/driving-school-owners/${id}`, data);
      return response.data;
    },

    deleteDrivingSchoolOwner: async (id: string): Promise<any> => {
      const response = await this.axiosService.delete(`/admin/driving-school-owners/${id}`);
      return response.data;
    },

    // Dashboard Endpoints
    getDashboard: async (): Promise<DashboardResponse> => {
      try {
        const response = await this.axiosService.get("/admin/dashboard");
        return response.data;
      } catch (error) {
        console.error('Error fetching admin dashboard:', error);
        return {
          success: false,
          error: 'Failed to fetch dashboard data',
          timestamp: new Date().toISOString()
        } as DashboardResponse;
      }
    },

    // Alternative method that matches systemService API - handles both admin and driving school
    getDashboardData: async (drivingSchoolCode?: string): Promise<DashboardResponse> => {
      try {
        // Use driving school endpoint if code is provided, otherwise use admin endpoint
        const endpoint = drivingSchoolCode 
          ? `/driving-school/${drivingSchoolCode}/dashboard`
          : `/admin/dashboard`;
        
        const response = await this.axiosService.get(endpoint);
        return response.data;
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
          success: false,
          error: 'Failed to fetch dashboard data',
          timestamp: new Date().toISOString()
        } as DashboardResponse;
      }
    },

    getSystemInfo: async (): Promise<SystemInfoResponse> => {
      try {
        const response = await this.axiosService.get("/admin/dashboard/system-info");
        return response.data;
      } catch (error) {
        console.error('Error fetching system info:', error);
        return {
          success: false,
          error: 'Failed to fetch system information',
          timestamp: new Date().toISOString()
        } as SystemInfoResponse;
      }
    },

    // System Logs Endpoints
    getSystemLogs: async (query?: any): Promise<any> => {
      const queryString = query ? new URLSearchParams(query).toString() : '';
      const endpoint = queryString ? `/admin/system-logs?${queryString}` : '/admin/system-logs';
      const response = await this.axiosService.get(endpoint);
      return response.data;
    },

    // Cities Endpoints
    getCities: async (): Promise<any[]> => {
      const response = await this.axiosService.get("/api/v1/cities");
      return response.data;
    },

    getAllDistricts: async (): Promise<any[]> => {
      const response = await this.axiosService.get("/api/v1/cities/districts");
      return response.data;
    },

    getDistrictsByCity: async (cityId: number): Promise<any[]> => {
      const response = await this.axiosService.get(`/api/v1/cities/${cityId}/districts`);
      return response.data;
    }
  };

  // Token and localStorage management
  private getToken(): string | null {
    return localStorage.getItem("token");
  }

  private handleUnauthorized(): void {
    //if logged in
    if (this.getToken()) {
      this.clearLocalStorage();
      window.location.href = "/";
      toast.warning("Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.");
    }
  }

  private clearLocalStorage(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    localStorage.removeItem("activeDrivingSchool");
    // Also clear the token from axios headers
    this.axiosService.setToken(null);
  }

  // Public methods for token management
  public setToken(token: string): void {
    localStorage.setItem("token", token);
    // Also set the token in both axios services immediately
    this.axiosService.setToken(token);
    this.fileAxiosService.setToken(token);
  }

  public setUser(user: any): void {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("userRole", user.userType);
    
    // Handle driving school selection
    if (user.drivingSchools && user.drivingSchools.length > 0) {
      const firstSchool = user.drivingSchools[0];
      const schoolInfo = { id: firstSchool.id, name: firstSchool.name };
      localStorage.setItem("activeDrivingSchool", JSON.stringify(schoolInfo));
    }
  }

  public getUser(): any {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  }

  public getUserRole(): string | null {
    return localStorage.getItem("userRole");
  }

  public getActiveDrivingSchool(): any {
    const schoolStr = localStorage.getItem("activeDrivingSchool");
    return schoolStr ? JSON.parse(schoolStr) : null;
  }

  // Toast management methods (delegated to axios service)
  public enableToast(): void {
    this.axiosService.enableToast();
  }

  public disableToast(): void {
    this.axiosService.disableToast();
  }
}

export const apiService = ApiService.getInstance();
export type { DrivingSchool };