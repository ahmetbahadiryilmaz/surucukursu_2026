import { LoginFormData, LoginFormValidation } from './login.types';
import { LOGIN_CONSTANTS } from './login.consts';
import { UserData } from '@/shared/types';
import { UserTypes } from '@/shared/enums';

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  return LOGIN_CONSTANTS.EMAIL_REGEX.test(email.trim());
};

/**
 * Validates password length
 */
export const validatePassword = (password: string): boolean => {
  return password.length >= LOGIN_CONSTANTS.MIN_PASSWORD_LENGTH;
};

/**
 * Validates entire login form data
 */
export const validateLoginForm = (formData: LoginFormData): LoginFormValidation => {
  const errors: string[] = [];

  if (!formData.email.trim()) {
    errors.push('E-posta adresi gereklidir');
  } else if (!validateEmail(formData.email)) {
    errors.push('Geçerli bir e-posta adresi giriniz');
  }

  if (!formData.password) {
    errors.push('Şifre gereklidir');
  } else if (!validatePassword(formData.password)) {
    errors.push(`Şifre en az ${LOGIN_CONSTANTS.MIN_PASSWORD_LENGTH} karakter olmalıdır`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Formats email for consistency (lowercase, trimmed)
 */
export const formatEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

/**
 * Clears all login-related data from storage
 */
export const clearLoginData = (): void => {
  const { STORAGE_KEYS } = LOGIN_CONSTANTS;
  
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_DRIVING_SCHOOL);
};

/**
 * Gets stored user data if available
 */
export const getStoredUserData = (): { user: UserData; token: string } | null => {
  const { STORAGE_KEYS } = LOGIN_CONSTANTS;
  
  try {
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    
    if (storedUser && token) {
      const parsedUser = JSON.parse(storedUser);
      
      // Ensure id is always a number
      if (parsedUser.id !== undefined) {
        parsedUser.id = Number(parsedUser.id);
      }
      
      // Ensure date is a number if provided
      if (parsedUser.date !== undefined && parsedUser.date !== null) {
        parsedUser.date = Number(parsedUser.date);
      }
      
      return {
        user: parsedUser as UserData,
        token
      };
    }
  } catch (error) {
    console.error('Error parsing stored user data:', error);
    clearLoginData();
  }
  
  return null;
};

/**
 * Maps a login request error (usually an Axios error) to a user-friendly
 * Turkish message. Avoids leaking raw messages like
 * "İstek 401 durum koduyla başarısız oldu." to the UI.
 */
export const getLoginErrorMessage = (error: any): string => {
  // Server responded with an error status
  if (error?.response) {
    const status = error.response.status;
    const backendMessage = error.response.data?.message;

    switch (status) {
      case 400:
      case 422:
        return backendMessage || 'Girdiğiniz bilgiler geçersiz. Lütfen kontrol edin.';
      case 401:
        // Backend sends "Invalid credentials" — never show it as-is.
        return 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.';
      case 403:
        return 'Bu hesabın giriş yetkisi bulunmuyor.';
      case 429:
        return 'Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.';
      default:
        if (status >= 500) {
          return 'Sunucuya şu anda ulaşılamıyor. Lütfen daha sonra tekrar deneyin.';
        }
        return backendMessage || 'Giriş yapılamadı. Lütfen tekrar deneyin.';
    }
  }

  // Request was made but no response (network/CORS/timeout)
  if (error?.request) {
    return 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.';
  }

  // Something else (e.g. a validation Error thrown before the request)
  return error?.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.';
};

/**
 * Determines redirect path based on user type
 */
export const getRedirectPath = (userType: number): string => {
  const { ROUTES } = LOGIN_CONSTANTS;
  
  // Using the UserTypes enum values
  if (userType === UserTypes.SUPER_ADMIN || userType === UserTypes.ADMIN) {
    return ROUTES.ADMIN;
  } else if (userType === UserTypes.DRIVING_SCHOOL_OWNER || userType === UserTypes.DRIVING_SCHOOL_MANAGER) {
    return ROUTES.DRIVING_SCHOOL;
  }
  
  throw new Error('Bilinmeyen kullanıcı tipi');
};
