import axios, { AxiosInstance } from "axios";
import { toast } from "react-toastify";

class AxiosService {
  private static instance: AxiosService;
  public api: AxiosInstance;
  private toastEnabled: boolean = true;
  private unauthorizedHandler?: () => void;

  private constructor(baseURL?: string) {
    const API_GATEWAY_PORT = import.meta.env.VITE_API_GATEWAY_PORT || '9501';
    // Use the gateway base WITH /api/v1 suffix
    const gatewayBase = `http://localhost:${API_GATEWAY_PORT}/api/v1`;
    this.api = axios.create({
      baseURL: baseURL || process.env.REACT_APP_API_BASE_URL || gatewayBase,
      headers: {
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  // Singleton pattern with optional base URL
  public static getInstance(baseURL?: string): AxiosService {
    if (!AxiosService.instance) {
      AxiosService.instance = new AxiosService(baseURL);
    } else if (baseURL && baseURL !== AxiosService.instance.api.defaults.baseURL) {
      // If a different base URL is provided, recreate the instance
      AxiosService.instance = new AxiosService(baseURL);
    }
    return AxiosService.instance;
  }

  private setupInterceptors(): void {
    // Add request interceptor - token is already set in headers
    this.api.interceptors.request.use(
      (config) => {
        // Token is already set in default headers, no need to do anything here
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor to handle common errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          // Delegate logout handling to external callback
          if (this.unauthorizedHandler) {
            this.unauthorizedHandler();
          }
        }
        
        // Log error details to console
        this.logError(error, "API Request Failed");
        
        // Show toast notification for errors if enabled
        if (this.toastEnabled) {
          this.showErrorToast(error);
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Token and callback management methods
  public setToken(token: string | null): void {
    if (token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.api.defaults.headers.common['Authorization'];
    }
  }

  public setUnauthorizedHandler(handler: () => void): void {
    this.unauthorizedHandler = handler;
  }

  private showErrorToast(error: any): void {
    if (!this.toastEnabled) return;

    let errorMessage = "Bir hata oluştu";

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // First try to get message from response data
      if (data && data.message) {
        errorMessage = data.message;
      } else {
        // Fallback to status-based error messages
        switch (status) {
          case 400:
            errorMessage = "Geçersiz istek. Lütfen girdiğiniz bilgileri kontrol edin.";
            break;
          case 401:
            errorMessage = "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.";
            break;
          case 403:
            errorMessage = "Bu işlem için yetkiniz bulunmuyor.";
            break;
          case 404:
            errorMessage = "Aranan kaynak bulunamadı.";
            break;
          case 409:
            errorMessage = "Bu veriler zaten mevcut.";
            break;
          case 422:
            errorMessage = "Girilen veriler geçersiz.";
            break;
          case 429:
            errorMessage = "Çok fazla istek gönderildi. Lütfen bekleyin.";
            break;
          case 500:
            errorMessage = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
            break;
          case 502:
            errorMessage = "Sunucu geçici olarak kullanılamıyor.";
            break;
          case 503:
            errorMessage = "Servis geçici olarak kullanılamıyor.";
            break;
          default:
            errorMessage = `Sunucu hatası (${status}). Lütfen daha sonra tekrar deneyin.`;
        }
      }
    } else if (error.request) {
      errorMessage = "Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.";
    } else {
      errorMessage = error.message || "Bilinmeyen bir hata oluştu.";
    }

    toast.error(errorMessage);
  }

  // Toast management methods
  public enableToast(): void {
    this.toastEnabled = true;
  }

  public disableToast(): void {
    this.toastEnabled = false;
  }

  // Error logging method (private - used by interceptor)
  private logError(error: any, customMessage: string): void {
    console.error(`${customMessage}:`, error);
    
    // Detaylı hata loglaması
    if (error.response) {
      console.error("Sunucu yanıtı detayları:", {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        config: error.response.config
      });
      
      // 500 hatası için özel işlem
      if (error.response.status === 500) {
        console.error("500 ERROR DETAILS:", {
          request: {
            method: error.config?.method,
            url: error.config?.url,
            data: error.config?.data
          },
          response: error.response.data
        });
      }
    } else if (error.request) {
      console.error("İstek gönderildi ama yanıt alınamadı:", error.request);
    } else {
      console.error("Hata detayı:", error.message);
    }
  }

  // HTTP Methods
  public async get<T = any>(url: string, config?: any) {
    const response = await this.api.get<T>(url, config);
    return response;
  }

  public async post<T = any>(url: string, data?: any, config?: any) {
    const response = await this.api.post<T>(url, data, config);
    return response;
  }

  public async put<T = any>(url: string, data?: any, config?: any) {
    const response = await this.api.put<T>(url, data, config);
    return response;
  }

  public async patch<T = any>(url: string, data?: any, config?: any) {
    const response = await this.api.patch<T>(url, data, config);
    return response;
  }

  public async delete<T = any>(url: string, config?: any) {
    const response = await this.api.delete<T>(url, config);
    return response;
  }
}

// Export the AxiosService class for direct use
export { AxiosService };
