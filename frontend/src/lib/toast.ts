import { toast, ToastOptions, Id } from 'react-toastify';

// Toast konfigürasyonu
const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
};

// Toast türleri için type definition
type ToastType = 'success' | 'error' | 'info' | 'warning';

 
// Fonksiyonel mesajlar için ayrı interface - Future use
// interface PromiseFunctionalMessages<T = any> {
//   pending: string;
//   success: string | ((data: T) => string);
//   error: string | ((error: any) => string);
// }

// Toast Class
class Toast {
  // Başarı mesajı
  static success(message: string, options?: ToastOptions): Id {
    return toast.success(message, { ...defaultOptions, ...options });
  }

  // Hata mesajı
  static error(message: string, options?: ToastOptions): Id {
    return toast.error(message, { ...defaultOptions, ...options });
  }

  // Bilgi mesajı
  static info(message: string, options?: ToastOptions): Id {
    return toast.info(message, { ...defaultOptions, ...options });
  }

  // Uyarı mesajı
  static warning(message: string, options?: ToastOptions): Id {
    return toast.warning(message, { ...defaultOptions, ...options });
  }

  // Yükleniyor mesajı (Loading)
  static loading(message: string, options?: ToastOptions): Id {
    return toast.loading(message, { ...defaultOptions, ...options });
  }

 
  // Manuel toast kapatma
  static dismiss(toastId?: Id): void {
    toast.dismiss(toastId);
  }

  static update(toastId: Id, message: string, type: ToastType = 'info', options?: ToastOptions): void {
    toast.update(toastId, {
      render: message,
      type: type, // 'success', 'error', 'info', 'warning'
      isLoading: false,
      ...defaultOptions,
      ...options,
    });
  }
  // updateLoading: loading toast'ı güncelle (DSOwnerPage ile uyumlu)
  static updateLoading(toastId: Id, message: string, type: ToastType = 'info', options?: ToastOptions): void {
    toast.update(toastId, {
      render: message,
      type,
      isLoading: false,
      ...defaultOptions,
      ...options,
    });
  }
  // Tüm toast'ları kapat
  static dismissAll(): void {
    toast.dismiss();
  }

  // Toast'ın aktif olup olmadığını kontrol et
  static isActive(toastId: Id): boolean {
    return toast.isActive(toastId);
  }
  
}

export default Toast;
