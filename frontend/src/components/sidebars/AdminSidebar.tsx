// components/AdminSidebar.tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Home, Users, ClipboardList, BarChart2, Settings, ChevronDown, ChevronRight, Server } from 'lucide-react';

interface SidebarProps {
  setActivePage: (page: string) => void;
}

const Sidebar = ({ setActivePage }: SidebarProps) => {
  const [isUsersOpen, setIsUsersOpen] = useState(false);
  const [activePage, setActivePageState] = useState("");
  const location = useLocation();

  // Sayfa değişikliklerini takip et
  useEffect(() => {
    const path = location.pathname.split('/admin/')[1] || "";
    setActivePageState(path);
    
    // Eğer kullanıcılar alt menülerinden birine gidilmişse, kullanıcılar menüsünü aç
    if (path.startsWith('kullanicilar/')) {
      setIsUsersOpen(true);
    }
  }, [location]);

  const handleUserItemClick = (page: string) => {
    setActivePage(page);
    setActivePageState(page);
  };

  // Aktif sayfaya göre stil belirleme fonksiyonu
  const getButtonClass = (page: string) => {
    const isActive = activePage === page;
    return `flex items-center w-full px-4 py-2 text-left rounded-md 
      ${isActive ? 'bg-secondary-foreground text-secondary' : 'hover:bg-secondary hover:text-secondary-foreground'}`;
  };

  // Kullanıcılar menüsü için özel kontrol
  const getUsersMenuClass = () => {
    const isUsersActive = activePage.startsWith('kullanicilar/') || activePage === 'kullanicilar';
    return `flex items-center justify-between w-full px-4 py-2 text-left rounded-md 
      ${isUsersActive ? 'bg-secondary-foreground text-secondary' : 'hover:bg-secondary hover:text-secondary-foreground'}`;
  };

  // Alt menü öğeleri için stil
  const getSubMenuClass = (page: string) => {
    const isActive = activePage === page;
    return `flex items-center w-full px-4 py-2 text-left rounded-md 
      ${isActive ? 'bg-secondary-foreground text-secondary' : 'hover:bg-secondary hover:text-secondary-foreground'}`;
  };

  return (
    <div className="h-full bg-card text-card-foreground w-64 p-4 border-r border-border">
      <div className="mb-8">
        <h1 className="text-xl font-bold">MTSK Admin</h1>
      </div>
      
      <nav className="space-y-2">
        <button
          onClick={() => handleUserItemClick("")}
          className={getButtonClass("")}
        >
          <Home className="w-5 h-5 mr-3" /> Dashboard
        </button>
        
        <button
          onClick={() => handleUserItemClick("kurslar")}
          className={getButtonClass("kurslar")}
        >
          <BarChart2 className="w-5 h-5 mr-3" /> Kurslar
        </button>
        
        {/* Kullanıcılar menüsü - alt menüler ile */}
        <div className="space-y-1">
          <button
            onClick={() => setIsUsersOpen(!isUsersOpen)}
            className={getUsersMenuClass()}
          >
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-3" /> Kullanıcılar
            </div>
            {isUsersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {isUsersOpen && (
            <div className="pl-6 space-y-1 ml-4 border-l border-gray-300">
              <button
                onClick={() => handleUserItemClick("kullanicilar/adminler")}
                className={getSubMenuClass("kullanicilar/adminler")}
              >
                <span className="text-sm">Adminler</span>
              </button>
              <button
                onClick={() => handleUserItemClick("kullanicilar/ds-manager")}
                className={getSubMenuClass("kullanicilar/ds-manager")}
              >
                <span className="text-sm">Driving School Manager</span>
              </button>
              <button
                onClick={() => handleUserItemClick("kullanicilar/ds-owner")}
                className={getSubMenuClass("kullanicilar/ds-owner")}
              >
                <span className="text-sm">Driving School Owner</span>
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={() => handleUserItemClick("islemler")}
          className={getButtonClass("islemler")}
        >
          <ClipboardList className="w-5 h-5 mr-3" /> İşlemler Geçmişi
        </button>
        
        <button
          onClick={() => handleUserItemClick("system-info")}
          className={getButtonClass("system-info")}
        >
          <Server className="w-5 h-5 mr-3" /> Sistem Bilgileri
        </button>
        
        <button
          onClick={() => handleUserItemClick("raporlar")}
          className={getButtonClass("raporlar")}
        >
          <BarChart2 className="w-5 h-5 mr-3" /> Raporlar
        </button>
        
        <button
          onClick={() => handleUserItemClick("hesabim")}
          className={getButtonClass("hesabim")}
        >
          <Settings className="w-5 h-5 mr-3" /> Hesap Ayarları
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;
