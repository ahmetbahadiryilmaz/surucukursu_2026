import { useState, useEffect } from "react";
import { useNavigate, Routes, Route } from "react-router-dom"; 
import { apiService } from "@/services/api-service"; 
import { Button } from "@/components/ui/button";
import { User, ChevronDown, Download, X, Car, Menu } from "lucide-react";
import Sidebar from "@/components/sidebars/DrivingSchoolOwnerSidebar";
import DownloadsSidebar from "@/components/sidebars/DownloadsSidebar";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import KursBilgileriPage from "./Kurslar";
import IslemlerTable from "./Islemler";
import Kursum from "./Kursum";
import SurucuKursuAyarlari from "./SurucuKursuAyarlari";
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

interface FailedJob {
  jobId: string;
  studentId: number;
  type: string;
  errorMessage: string;
  timestamp: Date;
}

export default function DrivingSchoolLayout() {
  const [userEmail, setUserEmail] = useState<string>("Bilinmeyen Kullanıcı");
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [completedDownloads, setCompletedDownloads] = useState<CompletedDownload[]>([]);
  const [ongoingJobs, setOngoingJobs] = useState<OngoingJob[]>([]);
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [myFiles, setMyFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
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

  const clearFailedJobs = () => {
    setFailedJobs([]);
  };

  const removeFailedJob = (index: number) => {
    setFailedJobs(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDownloadMenu = () => {
    setSideMenuOpen(!sideMenuOpen);
    // Fetch files when opening the menu
    if (!sideMenuOpen && activeDrivingSchool) {
      fetchMyFiles();
    }
  };

  // Fetch files for Dosyalarım section
  const fetchMyFiles = async () => {
    if (!activeDrivingSchool) return;

    try {
      setLoadingFiles(true);
      const response = await apiService.files.getFiles(activeDrivingSchool.id.toString());
      if (response.success) {
        setMyFiles(response.files || []);
      }
    } catch (err: any) {
      console.error('Error fetching files:', err);
      setMyFiles([]);
    } finally {
      setLoadingFiles(false);
    }
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
      
      // Check if job failed (status is 'failed' or progress is negative)
      if (data.status === 'failed' || data.progress < 0) {
        console.log('❌ Job failed, removing from ongoing jobs:', data.jobId);
        setOngoingJobs(prev => prev.filter(job => job.jobId !== data.jobId));
        return;
      }

      // Check if job completed (progress is 100)
      if (data.progress >= 100) {
        console.log('✅ Job completed, removing from ongoing jobs:', data.jobId);
        setOngoingJobs(prev => prev.filter(job => job.jobId !== data.jobId));
        // Refresh files list when a job is completed
        if (activeDrivingSchool) {
          fetchMyFiles();
        }
        return;
      }
      
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
      // Refresh files list when a PDF is completed
      if (activeDrivingSchool) {
        fetchMyFiles();
      }
    };

    const handlePdfError = (event: any) => {
      const data = event.detail;
      console.log('❌ Layout received pdf-error:', data);
      
      // Find the job info before removing it
      const failedJob = ongoingJobs.find(job => job.jobId === data.jobId);
      
      // Remove from ongoing jobs
      setOngoingJobs(prev => prev.filter(job => job.jobId !== data.jobId));
      
      // Add to failed jobs
      if (failedJob) {
        setFailedJobs(prev => [{
          jobId: data.jobId,
          studentId: failedJob.studentId,
          type: failedJob.type,
          errorMessage: data.message || data.error || 'PDF oluşturulurken bir hata oluştu',
          timestamp: new Date()
        }, ...prev]);
      }
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
              {ongoingJobs.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                  {ongoingJobs.length}
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
            <Route path="kursum" element={<DrivingSchoolHesabim />} />
            <Route path="mebbis" element={<Kursum />} />
            <Route 
              path="students" 
              element={<StudentsTable onDownload={addDownload} onJobStart={addOngoingJob} />} 
            />
            <Route path="cars" element={<AraclarTable />} />
            <Route path="simulasyon-raporlari" element={<SimulasyonRaporlariTable />} />
            <Route path="dosyalarim" element={<DosyalarimPage />} />
            <Route path="/" element={<DrivingSchoolDashboard />} />
          </Routes>
        </main>
      </div>

      {/* Downloads Sidebar Component */}
      <DownloadsSidebar
        isOpen={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
        completedDownloads={completedDownloads}
        onRemoveDownload={removeDownload}
        onClearDownloads={clearDownloads}
        ongoingJobs={ongoingJobs}
        failedJobs={failedJobs}
        onRemoveFailedJob={removeFailedJob}
        onClearFailedJobs={clearFailedJobs}
        myFiles={myFiles}
        loadingFiles={loadingFiles}
        activeDrivingSchoolId={activeDrivingSchool?.id}
      />

    </div>
  );
}
