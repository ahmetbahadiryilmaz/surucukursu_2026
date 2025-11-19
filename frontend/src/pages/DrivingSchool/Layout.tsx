import { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom"; 
import { apiService } from "@/services/api-service"; 
import { Button } from "@/components/ui/button";
import { User, ChevronDown, Download, X, Car, Menu } from "lucide-react";
import Sidebar from "@/components/sidebars/DrivingSchoolOwnerSidebar";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import KursBilgileriPage from "./Kurslar";
import IslemlerTable from "./Islemler";
import Kursum from "./Kursum";
import StudentsTable from "./Students";
import AraclarTable from "./Cars/Araclar";
import SimulasyonRaporlariTable from "./SimulasyonRaporlari"; 
import DosyalarimPage from "./Dosyalarim";
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import DrivingSchoolDashboard from "./Dashboard/DashboardPage";
import DrivingSchoolHesabim from "./DrivingSchoolHesabim";
import { drivingSchoolOwnerContext } from "@/components/contexts/DrivingSchoolManagerContext";

// Download için interface
interface CompletedDownload {
  id: number | string;
  studentId: number;
  type: string;
  filename: string;
  date: string;
}

interface OngoingJob {
  jobId: string;
  studentId: number;
  type: string;
  progress: number;
  message: string;
  startTime: Date;
}

export default function DrivingSchoolLayout() {
  const [userEmail, setUserEmail] = useState<string>("Bilinmeyen Kullanıcı");
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [completedDownloads, setCompletedDownloads] = useState<CompletedDownload[]>([]);
  const [ongoingJobs, setOngoingJobs] = useState<OngoingJob[]>([]);
  const navigate = useNavigate(); 

  const { refreshUserFromStorage, user, activeDrivingSchool, setActiveDrivingSchool } = drivingSchoolOwnerContext();

  // Move refreshUserFromStorage to useEffect
 

  // Log user when it changes
  useEffect(() => {
    console.log('User from context:', user);
  }, [user]);

  // Kullanıcı verileri ve logout logic'i mevcut koddan aynı şekilde devam edecek
  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Token bulunamadı");
        return;
      }
      
      const response = await apiService.me();
      
      if (response && response.email) {
        setUserEmail(response.email);
        localStorage.setItem("user", JSON.stringify(response));
        refreshUserFromStorage();
      }
    } catch (error) {
      console.error("Kullanıcı verileri alınırken hata oluştu:", error);
      const userData = localStorage.getItem("user");
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUserEmail(parsedUser.email || "Bilinmeyen Kullanıcı");
        } catch (error) {
          console.error("Kullanıcı verisi çözümlenirken hata oluştu:", error);
        }
      }
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await apiService.authentication.logout();
      navigate("/"); 
    } catch (error) {
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

  // Download ile ilgili metodlar
  const addDownload = (download: CompletedDownload) => {
    setCompletedDownloads(prev => [...prev, download]);
  };

  const removeDownload = (index: number) => {
    setCompletedDownloads(prev => prev.filter((_, i) => i !== index));
  };

  const clearDownloads = () => {
    setCompletedDownloads([]);
  };

  const toggleDownloadMenu = () => {
    setSideMenuOpen(!sideMenuOpen);
  };

  // Ongoing jobs management
  const addOngoingJob = (job: OngoingJob) => {
    setOngoingJobs(prev => {
      const existingIndex = prev.findIndex(j => j.jobId === job.jobId);
      if (existingIndex >= 0) {
        // Update existing job
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...job };
        return updated;
      } else {
        // Add new job
        return [...prev, job];
      }
    });
  };

  // Socket event listeners for job progress
  useEffect(() => {
    const handleJobUpdate = (event: any) => {
      const data = event.detail;
      console.log('📊 Layout received job-update:', data);
      
      // Add or update job in ongoingJobs
      setOngoingJobs(prev => {
        const existingIndex = prev.findIndex(j => j.jobId === data.jobId);
        if (existingIndex >= 0) {
          // Update existing job
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            progress: data.progress,
            message: data.message,
            // Update metadata if provided
            ...(data.studentId && { studentId: data.studentId }),
            ...(data.type && { type: data.type })
          };
          return updated;
        } else {
          // Add new job
          return [...prev, {
            jobId: data.jobId,
            studentId: data.studentId || 0,
            type: data.type || 'pdf',
            progress: data.progress,
            message: data.message,
            startTime: new Date()
          }];
        }
      });
    };

    const handlePdfCompleted = (event: any) => {
      const data = event.detail;
      console.log('✅ Layout received pdf-completed:', data);
      setOngoingJobs(prev => prev.filter(job => job.jobId !== data.jobId));
    };

    const handlePdfError = (event: any) => {
      const data = event.detail;
      console.log('❌ Layout received pdf-error:', data);
      setOngoingJobs(prev => prev.filter(job => job.jobId !== data.jobId));
    };

    window.addEventListener('job-update', handleJobUpdate);
    window.addEventListener('pdf-completed', handlePdfCompleted);
    window.addEventListener('pdf-error', handlePdfError);

    return () => {
      window.removeEventListener('job-update', handleJobUpdate);
      window.removeEventListener('pdf-completed', handlePdfCompleted);
      window.removeEventListener('pdf-error', handlePdfError);
    };
  }, []);

  const handleSchoolChange = (schoolId: number) => {
    setActiveDrivingSchool(schoolId);
    console.log(`Switched to school ID: ${schoolId}`);
  };

  // Get available colors for school indicators
  const getSchoolColor = (index: number) => {
    const colors = ['bg-green-500', 'bg-blue-500', 'bg-orange-500', 'bg-purple-500', 'bg-red-500', 'bg-yellow-500'];
    return colors[index % colors.length];
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar setActivePage={(page) => navigate(`/driving-school/${page}`)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-card text-card-foreground flex justify-between items-center border-b border-border">
          {/* Mobile Sidebar Trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" className="md:hidden">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-card text-card-foreground p-4">
              <Sidebar setActivePage={(page) => navigate(`/driving-school/${page}`)} />
            </SheetContent>
          </Sheet>

          {/* Page Title */}
          <h1 className="text-2xl font-bold">Sürücü Kursu Paneli</h1>

          {/* User Menu ve Download Menu */}
          <div className="flex items-center gap-4">
            {/* Download Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleDownloadMenu}
              className="relative"
            >
              <Download className="w-5 h-5" />
              {completedDownloads.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center text-xs">
                  {completedDownloads.length}
                </span>
              )}
            </Button>

            {/* Driving School Picker Dropdown */}
            {user?.drivingSchools && user.drivingSchools.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="text-foreground border-border bg-card flex items-center gap-2">
                    <Car className="w-4 h-4 mr-1" />
                    <span className="max-w-[120px] truncate">
                      {activeDrivingSchool?.name || user.drivingSchools[0]?.name || "Sürücü Kursu Seçin"}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56 bg-card text-card-foreground p-2 border border-border rounded-md shadow-lg">
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground mb-2">Sürücü Kurslarım</p>
                    <div className="space-y-1">
                      {user.drivingSchools.map((school, index) => (
                        <DropdownMenuItem 
                          key={school.id}
                          className="flex items-center gap-2 cursor-pointer rounded-md"
                          onClick={() => handleSchoolChange(school.id)}
                        >
                          <div className={`w-2 h-2 rounded-full ${getSchoolColor(index)}`} />
                          <span className="flex-1 truncate">{school.name}</span>
                          {activeDrivingSchool?.id === school.id && (
                            <span className="ml-auto text-xs text-primary">✓</span>
                          )}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="text-foreground border-border bg-card flex items-center gap-2">
                  <User className="w-4 h-4 mr-2" /> {user?.email || userEmail}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-card text-card-foreground p-2 border border-border rounded-md shadow-lg">
                <DropdownMenuItem onClick={() => navigate('/driving-school/hesabim')}>Hesabım</DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Çıkış Yap</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-6 relative">
          <Routes>
            <Route path="kurs-bilgileri" element={<KursBilgileriPage />} />
            <Route path="islemler" element={<IslemlerTable />} />
            <Route path="kursum" element={<Kursum />} />
            <Route 
              path="students" 
              element={<StudentsTable onDownload={addDownload} onJobStart={addOngoingJob} />} 
            />
            <Route path="cars" element={<AraclarTable />} />
            <Route path="simulasyon-raporlari" element={<SimulasyonRaporlariTable />} />
            <Route path="dosyalarim" element={<DosyalarimPage />} />
            <Route path="hesabim" element={<DrivingSchoolHesabim />} />
            <Route path="/" element={<DrivingSchoolDashboard />} />
          </Routes>
        </main>
      </div>

      {/* Download Menüsü */}
      <div
        className={`fixed inset-y-0 right-0 w-64 bg-white dark:bg-gray-800 shadow-lg p-4 transform transition-transform duration-300 ease-in-out z-50 ${
          sideMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-6 border-b pb-3 border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            İndirilen Dosyalar
          </h3>
          <div className="flex gap-2 items-center">
            {completedDownloads.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDownloads}
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                Hepsini Temizle
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSideMenuOpen(false)} 
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Ongoing Jobs Section */}
          {ongoingJobs.length > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Devam Eden İndirmeler ({ongoingJobs.length})
              </h4>
              <div className="space-y-3">
                {ongoingJobs.map((job) => (
                  <div key={job.jobId} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-2">
                        <Download size={16} className="text-blue-500" />
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          Öğrenci {job.studentId}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({job.type})
                        </span>
                      </div>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {job.progress}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                    
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {job.message}
                    </p>
                    
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Başlangıç: {job.startTime.toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Downloads Section */}
          {completedDownloads.length > 0 ? (
            completedDownloads.map((download, index) => (
              <div
                key={`${download.studentId}-${download.type}-${index}`}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm">{download.filename}</p>
                    <p className="text-xs text-gray-500">{download.type}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => removeDownload(index)}
                  >
                    <X className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {download.date}
                </div>
              </div>
            ))
          ) : ongoingJobs.length === 0 ? (
            <p className="text-center text-gray-500">Henüz indirilen dosya yok</p>
          ) : null}
        </div>
      </div>

      {/* Download Menu Overlay */}
      {sideMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40" 
          onClick={() => setSideMenuOpen(false)}
        />
      )}

    </div>
  );
}
