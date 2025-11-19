import { useState, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Car, 
  Home, 
  Settings,
  FolderOpen,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
 
// import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext"; // Currently unused

interface SidebarProps {
  setActivePage: (page: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  children?: MenuItem[];
}

const Sidebar = ({ setActivePage }: SidebarProps) => {
  const [activeItem, setActiveItem] = useState<string>("home");
  const [openMenus, setOpenMenus] = useState<{ [key: string]: boolean }>({
    ayarlar: false,
  });
  
  // const {  setActiveDrivingSchool } = drivingSchoolOwnerContext(); // Currently unused
  const handleClick = (page: string) => {
    setActiveItem(page);
    setActivePage(page);
  };

  const toggleMenu = (menuId: string) => {
    setOpenMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const menuItems: MenuItem[] = [
    { id: "", label: "Dashboard", icon: <Home className="w-5 h-5 mr-2" /> },
    { id: "students", label: "Öğrenciler", icon: <Users className="w-5 h-5 mr-2" /> },
    { id: "cars", label: "Araçlar", icon: <Car className="w-5 h-5 mr-2" /> },
    { id: "dosyalarim", label: "Dosyalarım", icon: <FolderOpen className="w-5 h-5 mr-2" /> },
    { 
      id: "ayarlar", 
      label: "Ayarlar", 
      icon: <Settings className="w-5 h-5 mr-2" />,
      children: [
        { id: "kursum", label: "Sürücü Kursu Ayarları", icon: <Settings className="w-4 h-4 mr-2" /> },
        { id: "mebbis", label: "MEBBIS Ayarları", icon: <Settings className="w-4 h-4 mr-2" /> }
      ]
    }
  ];

  return (
    <div className="w-64 h-full border-r border-border bg-card text-card-foreground hidden md:block">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6">MTSK Yönetim</h2>
        
        <nav className="space-y-2">
          {menuItems.map((item) => {
            // Check if item has children (is a parent menu)
            if (item.children) {
              return (
                <Collapsible
                  key={item.id}
                  open={openMenus[item.id]}
                  onOpenChange={() => toggleMenu(item.id)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between"
                    >
                      <span className="flex items-center">
                        {item.icon}
                        {item.label}
                      </span>
                      {openMenus[item.id] ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-4 space-y-1 mt-1">
                    {item.children.map((child) => (
                      <Button
                        key={child.id}
                        variant={activeItem === child.id ? "default" : "ghost"}
                        className="w-full justify-start text-sm"
                        onClick={() => handleClick(child.id)}
                      >
                        {child.icon}
                        {child.label}
                      </Button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            }
            
            // Regular menu item without children
            return (
              <Button
                key={item.id}
                variant={activeItem === item.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleClick(item.id)}
              >
                {item.icon}
                {item.label}
              </Button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
