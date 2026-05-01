import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import ToastService from "@/lib/toast";
import { getStoredUserData, clearLoginData, getRedirectPath } from "@/pages/(Auth)/Login/login.utils";

export const useSessionCheck = () => {
  const navigate = useNavigate();
  const { setUser, clearUserData } = drivingSchoolOwnerContext();

  useEffect(() => {
    const checkLoggedInUser = async () => {
      const userData = getStoredUserData();
      
      if (userData) {
        try {
          const { user } = userData;
          setUser(user);
          
          try {
            if (user && user.userType) {
              const redirectPath = getRedirectPath(user.userType);
              // Silent redirect
              window.location.href = redirectPath;
            }
          } catch (error) {
            console.error("Token validation failed:", error);
            clearLoginData();
            ToastService.warning("Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.");
          }
        } catch (error) {
          console.error("Error with user session:", error);
          clearLoginData();
          ToastService.error("Oturum verisi bozuk. Lütfen tekrar giriş yapın.");
        }
      }
    };
    
    checkLoggedInUser();
  }, [navigate, setUser, clearUserData]);
};
