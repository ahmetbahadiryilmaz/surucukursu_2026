import { useNavigate } from "react-router-dom";
import { UserTypes } from "@/shared/enums";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import { apiService } from "@/services/api-service";
import ToastService from "@/lib/toast";
import { LoginFormData } from "../login.types";
import { LoginResponse } from "@/shared/types";
import { formatEmail, validateLoginForm, getRedirectPath, getLoginErrorMessage } from "../login.utils";

export const useLoginLogic = () => {
  const navigate = useNavigate();
  const { setUser } = drivingSchoolOwnerContext();

  const handleLogin = async (formData: LoginFormData): Promise<void> => {
    // Validate form data
    const validation = validateLoginForm(formData);
    if (!validation.isValid) {
      ToastService.error(validation.errors[0]);
      throw new Error(validation.errors[0]);
    }

    const formattedEmail = formatEmail(formData.email);
    
    // Show loading toast
    const loadingToast = ToastService.loading('Giriş yapılıyor...');

    try {
      // API login request - leverages axios service error handling
      const response: LoginResponse = await apiService.authentication.login(formattedEmail, formData.password);

      // Validate response structure
      if (!response.token || !response.user) {
        throw new Error('Giriş başarısız. Geçersiz sunucu yanıtı.');
      }

      console.log('🔐 Login successful, response:', response);
      console.log('👤 User data from login:', response.user);

      // Set user in context - API service already handles localStorage
      const userData = {
        id: response.user.id || response.user.userId,
        email: response.user.email,
        userType: response.user.userType,
        date: response.user.date || response.user.created_at,
        drivingSchools: response.user.drivingSchools,
      };
      
      console.log('📝 Setting user data in context:', userData);
      setUser(userData);
      
      // Get user role and redirect path
      const userRole = response.user.userType;
      const redirectPath = getRedirectPath(userRole);
      
      // Show role-specific welcome message after a short delay
      
        const welcomeMessage = getWelcomeMessage(userRole, response.user.email);
        ToastService.update(loadingToast, welcomeMessage, 'success');
      
      
      // Navigate to appropriate page
      navigate(redirectPath);
      
    } catch (error: any) {
      const friendlyMessage = getLoginErrorMessage(error);
      ToastService.update(loadingToast, friendlyMessage, 'error');

      // Re-throw with the friendly message so LoginForm can display it
      throw new Error(friendlyMessage);
    }
  };

  // Helper function to generate role-specific welcome messages
  const getWelcomeMessage = (userRole: any, email: string): string => {
    switch (userRole) {
      case UserTypes.ADMIN:
      case UserTypes.SUPER_ADMIN:
        return `Hoş geldiniz Admin! (${email})`;
      
      case UserTypes.DRIVING_SCHOOL_OWNER:
        return `Hoş geldiniz Kurs Sahibi! (${email})`;
      
      case UserTypes.DRIVING_SCHOOL_MANAGER:
        return `Hoş geldiniz Kurs Yöneticisi! (${email})`;
      
      default:
        return `Hoş geldiniz! (${email})`;
    }
  };

  return { handleLogin };
};
