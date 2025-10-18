import { useEffect, useState } from "react";
import AdminSidebar from "@/components/sidebars/AdminSidebar";
import DrivingSchoolOwnerSidebar from "@/components/sidebars/DrivingSchoolOwnerSidebar";
import { UserTypes } from "@/shared/enums";

 
const SchoolSidebar = ({ setActivePage }: { setActivePage: (page: string) => void }) => {
  const [userRole, setUserRole] = useState(""); 

  useEffect(() => {
    
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUserRole(parsedUser.role || "Bilinmeyen Rol");
      } catch (error) {
        console.error("Kullanıcı verisi çözümlenirken hata oluştu:", error);
      }
    }
  }, []);

  return (
    <div>
      {parseInt(userRole) == UserTypes.ADMIN ? (
        <AdminSidebar setActivePage={setActivePage} />
      ) : parseInt(userRole)  ===  UserTypes.DRIVING_SCHOOL_OWNER ? (
        <DrivingSchoolOwnerSidebar setActivePage={setActivePage} />
      ) : (
        <div className="hidden md:flex w-64 bg-card text-card-foreground h-screen p-4 flex-col border-r border-border">
          {/* Varsayılan sidebar */}
          <span className="font-bold text-sm">Bilinmeyen Kullanıcı</span>
        </div>
      )}
    </div>
  );
};

export default SchoolSidebar;
