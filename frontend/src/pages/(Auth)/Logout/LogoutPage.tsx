import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";
import ToastService from "@/lib/toast";

export default function LogoutPage() {
  const navigate = useNavigate();
  const { clearUserData } = drivingSchoolOwnerContext();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Clear user data from context and localStorage
        clearUserData();
        
        // Clear all relevant localStorage items
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("activeDrivingSchool");
        
        // Show success message
        ToastService.success("Başarıyla çıkış yapıldı");
        
        // Redirect to login page
        navigate("/", { replace: true });
      } catch (error) {
        console.error("Logout error:", error);
        ToastService.error("Çıkış yapılırken bir hata oluştu");
        navigate("/", { replace: true });
      }
    };

    performLogout();
  }, [navigate, clearUserData]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Çıkış yapılıyor...</p>
      </div>
    </div>
  );
}
