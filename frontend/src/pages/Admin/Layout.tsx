import { useState, useEffect } from "react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { apiService } from "@/services/api-service";
import { Button } from "@/components/ui/button";
import { User, Menu, ChevronDown, X, Home, Users, Activity, Settings } from "lucide-react";
import Sidebar from "@/components/sidebars/AdminSidebar";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import KurslarPage from "./Kurslar/KurslarPage";
import KullanicilarPage from "./KullanicilarPage";
import KullaniciDetay from "./KullaniciDetay";
import IslemlerGecmisi from "./IslemlerGecmisi";
import AdminlerPage from "./AdminlerPage";
import DSManagerPage from "./DSManagerPage";
import DSOwnerPage from "./DSOwnerPage";
import AdminDashboard from "./Dashboard/DashboardPage";
import AdminHesabim from "./AdminHesabim";
import SystemInfoDashboard from "@/components/SystemInfoDashboard";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";

export default function AdminLayout() {
  const [userEmail, setUserEmail] = useState<string>("Bilinmeyen Kullanıcı");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  interface UserData {
    email?: string;
    [key: string]: any;
  }

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser: UserData = JSON.parse(userData);
        setUserEmail(parsedUser.email || "Bilinmeyen Kullanıcı");
      } catch (error) {
        console.error("Kullanıcı verisi çözümlenirken hata oluştu:", error);
      }
    }
  }, [location]);

  // Mobil menüyü kapat - sayfa geçişlerinde otomatik kapanma
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      console.log("Çıkış işlemi başlatılıyor...");
      // Bu kodu localStorage.clear() yerine kullanın:

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
      await apiService.authentication.logout();
      console.log("API logout başarılı!");
      navigate("/");
    } catch (error) {
      if (error instanceof Error) {
        console.error("Çıkış işlemi sırasında hata oluştu:", error.message);
      } else {
        console.error("Çıkış işlemi sırasında bilinmeyen bir hata oluştu:", error);
      }
      // Bu kodu localStorage.clear() yerine kullanın:

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
      navigate("/");
    }
  };
  
  const handleHesabim = () => {
    navigate("/admin/hesabim");
  }

  const handleActivePage = (page: string) => {
    navigate(`/admin/${page}`);
    setIsMobileMenuOpen(false); // Sayfa değiştiğinde mobil menüyü kapat
  };

  // Aktif sayfayı belirleme
  const getActivePage = () => {
    const path = location.pathname.split('/')[2] || '';
    return path;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background text-foreground">
      {/* Masaüstü Sidebar - Mobilde gizli */}
      <div className="hidden md:block w-64 border-r border-border overflow-y-auto">
        <Sidebar setActivePage={handleActivePage} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header - DÜZELTME: sticky ve z-50 eklendi */}
        <div className="p-3 md:p-4 bg-card text-card-foreground flex justify-between items-center border-b border-border sticky top-0 z-50">
          {/* Mobile Sidebar Trigger */}
          <div className="flex items-center gap-2">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(true)}>
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[80%] sm:w-64 p-0 border-r border-border">
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-bold text-lg">MTSK Admin</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-auto">
                    <Sidebar setActivePage={handleActivePage} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Page Title */}
            <h1 className="text-lg md:text-xl font-bold truncate">Admin Panel</h1>
          </div>

          {/* User Menu - DÜZELTME: z-index yükseltildi */}
          <div className="flex items-center relative z-50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="text-foreground border-border bg-card flex items-center gap-1 px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm">
                  <User className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> 
                  <span className="max-w-[80px] md:max-w-[150px] truncate">{userEmail}</span>
                  <ChevronDown className="w-3 h-3 md:w-4 md:h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-card text-card-foreground p-2 border border-border rounded-md shadow-lg z-[9999]">
                <DropdownMenuItem onClick={handleHesabim} className="text-sm cursor-pointer">Hesabım</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-sm cursor-pointer">Çıkış Yap</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content Area - DÜZELTME: z-index eklendi */}
        <main className="flex-1 p-2 md:p-6 overflow-auto relative z-10">
          <Routes>
            <Route path="kurslar" element={<KurslarPage />} />
            <Route path="kullanicilar" element={<KullanicilarPage />} />
            <Route path="kullanici-detay/:id" element={<KullaniciDetay />} />
            
            {/* Kullanıcı Kategorileri */}
            <Route path="kullanicilar/adminler" element={<AdminlerPage />} />
            <Route path="kullanicilar/ds-manager" element={<DSManagerPage />} />
            <Route path="kullanicilar/ds-owner" element={<DSOwnerPage />} />
            
            {/* Detay Sayfaları - Geçici Çözüm */}
            <Route path="kullanicilar/adminler/detay/:id" element={<KullaniciDetay />} />
            <Route path="kullanicilar/ds-manager/detay/:id" element={<KullaniciDetay />} />
            <Route path="kullanicilar/ds-owner/detay/:id" element={<KullaniciDetay />} />
            
            <Route path="islemler" element={<IslemlerGecmisi />} />
            <Route path="system-info" element={<SystemInfoDashboard />} />
            <Route path="/" element={<AdminDashboard />} />
            <Route path="hesabim" element={<AdminHesabim />} />
          </Routes>
        </main>

        {/* Mobil Cihazlar için Alt Navigasyon Bar */}
        <div className="md:hidden border-t border-border p-2 flex justify-around bg-card">
          <Button 
            variant={getActivePage() === '' ? "default" : "ghost"} 
            size="sm" 
            className="text-xs flex flex-col items-center p-2 h-auto"
            onClick={() => navigate("/admin/")}
          >
            <Home size={16} className="mb-1" />
            <span>Ana Sayfa</span>
          </Button>
          <Button 
            variant={getActivePage() === 'kullanicilar' ? "default" : "ghost"} 
            size="sm" 
            className="text-xs flex flex-col items-center p-2 h-auto"
            onClick={() => navigate("/admin/kullanicilar")}
          >
            <Users size={16} className="mb-1" />
            <span>Kullanıcılar</span>
          </Button>
          <Button 
            variant={getActivePage() === 'islemler' ? "default" : "ghost"} 
            size="sm" 
            className="text-xs flex flex-col items-center p-2 h-auto"
            onClick={() => navigate("/admin/islemler")}
          >
            <Activity size={16} className="mb-1" />
            <span>İşlemler</span>
          </Button>
          <Button 
            variant={getActivePage() === 'hesabim' ? "default" : "ghost"} 
            size="sm" 
            className="text-xs flex flex-col items-center p-2 h-auto"
            onClick={() => navigate("/admin/hesabim")}
          >
            <Settings size={16} className="mb-1" />
            <span>Hesabım</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
