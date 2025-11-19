import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Car, 
  Home, 
  Settings,
  FolderOpen,
} from "lucide-react";
 
// import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext"; // Currently unused

interface SidebarProps {
  setActivePage: (page: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: ReactNode;
}

const Sidebar = ({ setActivePage }: SidebarProps) => {
  const [activeItem, setActiveItem] = useState<string>("home");
  // const {  setActiveDrivingSchool } = drivingSchoolOwnerContext(); // Currently unused
  const handleClick = (page: string) => {
    setActiveItem(page);
    setActivePage(page);
  };

  const menuItems: MenuItem[] = [
    { id: "", label: "Dashboard", icon: <Home className="w-5 h-5 mr-2" /> },
    { id: "kursum", label: "MEBBIS Ayarları", icon: <Settings className="w-5 h-5 mr-2" /> },
    { id: "students", label: "Öğrenciler", icon: <Users className="w-5 h-5 mr-2" /> },
    { id: "cars", label: "Araçlar", icon: <Car className="w-5 h-5 mr-2" /> },
    { id: "dosyalarim", label: "Dosyalarım", icon: <FolderOpen className="w-5 h-5 mr-2" /> },
    { id: "hesabim", label: "Hesap Ayarları", icon: <Settings className="w-5 h-5 mr-2" /> }
  ];

  return (
    <div className="w-64 h-full border-r border-border bg-card text-card-foreground hidden md:block">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6">MTSK Yönetim</h2>
   

 
        
        <nav className="space-y-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant={activeItem === item.id ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => handleClick(item.id)}
            >
              {item.icon}
              {item.label}
            </Button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
