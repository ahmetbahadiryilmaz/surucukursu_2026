import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, X, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";

// Sidebar Context tiplerini tanımla
type DownloadItem = {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  filename: string;
  date: string;
  viewed: boolean;
};

type DownloadContextType = {
  sideMenuOpen: boolean;
  toggleSideMenu: () => void;
  closeSideMenu: () => void;
  downloadStatus: string;
  completedDownloads: DownloadItem[];
  notificationCount: number;
  addDownload: (download: Omit<DownloadItem, "id" | "viewed" | "date">) => void;
  removeDownload: (id: string) => void;
  clearAllDownloads: () => void;
};

// Context'i oluştur
const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

// Hook'u tanımla
export const useDownload = () => {
  const context = useContext(DownloadContext);
  if (context === undefined) {
    throw new Error("useDownload must be used within a DownloadProvider");
  }
  
  const startDownload = async (studentId: string, studentName: string, type: string, actualFile?: Blob) => {
    // Yeni indirme ekle
    context.addDownload({
      studentId,
      studentName,
      type,
      filename: `${studentName.replace(/\s+/g, "_").toLowerCase()}_${type}_raporu.pdf`
    });
    
    // Eğer gerçek bir dosya varsa, indirme işlemini gerçekleştir
    if (actualFile) {
      const filename = `${studentName.replace(/\s+/g, "_").toLowerCase()}_${type}_raporu.pdf`;
      const url = URL.createObjectURL(actualFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  return { startDownload };
};

// Download Sidebar bileşeni
const DownloadSidebar = () => {
  const { 
    sideMenuOpen, 
    closeSideMenu, 
    downloadStatus, 
    completedDownloads, 
    notificationCount,
    toggleSideMenu,
    removeDownload,
    clearAllDownloads
  } = useContext(DownloadContext) as DownloadContextType;

  const [activeTab, setActiveTab] = useState("all");
  
  // Ekran boyutunu takip et
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mobil için sidebar genişliği
  const sidebarWidth = windowWidth < 768 ? "w-full" : "w-72";

  // İndirilen raporları formatla
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch (error) {
      return dateString;
    }
  };

  return (
    <>
      {/* Sabit indirme ikonu - Bildirim sayacı ile */}
      <Button
        className="fixed bottom-4 right-4 shadow-lg rounded-full p-3 z-50 bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-700 dark:hover:bg-blue-800"
        onClick={toggleSideMenu}
      >
        <Download className="h-6 w-6" />
        {notificationCount > 0 && (
          <Badge variant="destructive" className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center rounded-full">
            {notificationCount}
          </Badge>
        )}
      </Button>

      {/* Sağ açılır menü */}
      <div
        className={`fixed inset-y-0 right-0 ${sidebarWidth} bg-white dark:bg-gray-800 shadow-lg p-4 transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
          sideMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Download className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            İndirilen Raporlar
          </h3>
          <div className="flex gap-2 items-center">
            {completedDownloads.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllDownloads}
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                Hepsini Temizle
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={closeSideMenu} 
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={18} />
            </Button>
          </div>
        </div>

        {/* Tab menü */}
        <div className="flex mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-4 py-2 text-sm flex items-center gap-1 ${
              activeTab === "recent"
                ? "border-b-2 border-blue-500 text-blue-500 font-medium"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("recent")}
          >
            <Clock size={16} />
            Son İndirilenler
          </button>
          <button
            className={`px-4 py-2 text-sm flex items-center gap-1 ${
              activeTab === "all"
                ? "border-b-2 border-blue-500 text-blue-500 font-medium"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
            onClick={() => setActiveTab("all")}
          >
            <Download size={16} />
            Tümü
          </button>
        </div>

        {/* Ana içerik alanı */}
        <div className="flex-grow overflow-y-auto">
          {downloadStatus === "downloading" && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md mb-4 flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500 dark:text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Rapor indiriliyor...
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Lütfen bekleyin...
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {completedDownloads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
                <Download className="h-10 w-10 mb-2 opacity-50" />
                <p>Henüz indirilmiş rapor bulunmuyor</p>
              </div>
            ) : (
              completedDownloads
                .filter(download => {
                  if (activeTab === "recent") {
                    // Son 7 günlük indirmeler
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                    return new Date(download.date) > oneWeekAgo;
                  }
                  return true;
                })
                .map((download) => (
                  <div
                    key={download.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex-1 flex flex-col gap-2">
                      {/* Rapor başlığı ve durum */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="bg-green-100 dark:bg-green-800 p-1.5 rounded-full">
                            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {download.studentName.split(" ")[0]}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {download.type} raporu
                            </p>
                          </div>
                        </div>
                        
                        {/* Silme butonu - hover durumunda */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-opacity"
                          onClick={() => removeDownload(download.id)}
                        >
                          <XCircle size={16} />
                        </Button>
                      </div>
                      
                      {/* Dosya adı */}
                      <div className="ml-9 -mt-1">
                        <p className="text-xs text-gray-600 dark:text-gray-300 mb-1 truncate max-w-[180px]">
                          {download.filename}
                        </p>
                      </div>
                      
                      {/* Tarih bilgisi ve silme butonu */}
                      <div className="flex justify-between items-center ml-9">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} className="text-gray-400 dark:text-gray-500" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(download.date)}
                          </p>
                        </div>
                        
                        {/* Her zaman görünür silme butonu */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                          onClick={() => removeDownload(download.id)}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Karartma overlay'i */}
      {sideMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 transition-all duration-300" 
          onClick={closeSideMenu}
        ></div>
      )}
    </>
  );
};

// Provider bileşeni
export const DownloadProvider = ({ children }: { children: ReactNode }) => {
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState("idle");
  const [completedDownloads, setCompletedDownloads] = useState<DownloadItem[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // LocalStorage'dan indirme geçmişini yükle
  useEffect(() => {
    const savedDownloads = localStorage.getItem("completedDownloads");
    if (savedDownloads) {
      try {
        const parsedDownloads = JSON.parse(savedDownloads);
        setCompletedDownloads(parsedDownloads);
        
        // Görülmemiş indirmeleri say
        const unseenCount = parsedDownloads.filter((d: DownloadItem) => !d.viewed).length;
        setNotificationCount(unseenCount);
      } catch (err) {
        console.error("İndirme geçmişi yüklenirken hata:", err);
      }
    }
  }, []);

  // İndirmeleri LocalStorage'a kaydet
  useEffect(() => {
    if (completedDownloads.length > 0) {
      localStorage.setItem("completedDownloads", JSON.stringify(completedDownloads));
    }
  }, [completedDownloads]);

  // Sidebar'ı aç/kapat
  const toggleSideMenu = () => {
    setSideMenuOpen((prev) => !prev);
    
    // Sidebar açıldığında bildirimleri görüldü olarak işaretle
    if (!sideMenuOpen) {
      setCompletedDownloads((prev) =>
        prev.map((download) => ({ ...download, viewed: true }))
      );
      setNotificationCount(0);
    }
  };

  // Sidebar'ı kapat
  const closeSideMenu = () => {
    setSideMenuOpen(false);
  };

  // Yeni indirme ekle
  const addDownload = (download: Omit<DownloadItem, "id" | "viewed" | "date">) => {
    setDownloadStatus("downloading");
    
    // Gerçek bir indirme işlemi burada simüle edilebilir
    setTimeout(() => {
      const newDownload: DownloadItem = {
        ...download,
        id: `${download.studentId}-${download.type}-${Date.now()}`,
        date: new Date().toISOString(),
        viewed: false
      };
      
      setCompletedDownloads((prev) => [newDownload, ...prev]);
      setNotificationCount((prev) => prev + 1);
      setDownloadStatus("completed");
    }, 1000);
  };

  // İndirme sil
  const removeDownload = (id: string) => {
    setCompletedDownloads((prev) => {
      const updated = prev.filter((download) => download.id !== id);
      localStorage.setItem("completedDownloads", JSON.stringify(updated));
      return updated;
    });
  };

  // Tüm indirmeleri temizle
  const clearAllDownloads = () => {
    localStorage.removeItem("completedDownloads");
    setCompletedDownloads([]);
    setDownloadStatus("idle");
    setNotificationCount(0);
  };

  const value = {
    sideMenuOpen,
    toggleSideMenu,
    closeSideMenu,
    downloadStatus,
    completedDownloads,
    notificationCount,
    addDownload,
    removeDownload,
    clearAllDownloads
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
      <DownloadSidebar />
    </DownloadContext.Provider>
  );
};

export default DownloadProvider;
