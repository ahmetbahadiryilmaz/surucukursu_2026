import { useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { apiService } from "@/services/api-service";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Call the API logout endpoint
        await apiService.authentication.logout();
        console.log("API logout successful");
      } catch (error) {
        console.error("Error during logout:", error);
      } finally {
        // Sadece kullanıcı ile ilgili verileri temizle, tema tercihini koru
        const keysToRemove = [
          "user",
          "token", 
          "userRole",
          "activeDrivingSchool"
        ];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        console.log("User data cleared, theme preference preserved");
        
        // Redirect to login page
        navigate("/");
      }
    };

    performLogout();
  }, [navigate]);

  // Simple loading indicator while logout is processing
  return (
    <Fragment>
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-lg">Çıkış yapılıyor...</p>
      </div>
    </Fragment>
  );
};

export default Logout;
