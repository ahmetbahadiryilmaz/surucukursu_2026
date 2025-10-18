import { useState, useEffect } from 'react';
import { Clock, User, Filter, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api-service';
import { useTheme } from "@/components/providers/ThemeProvider";

// Log type definition based on the API response
type SystemLog = {
  id: number;
  user_id: number;
  user_type: number;
  process: number;
  description: string;
  created_at: string;
  // We can add username here since it's displayed but not in the API response
  userName?: string;
};

// API response type
type LogsResponse = {
  data: SystemLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const IslemlerGecmisi = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // İç isMobile state'i oluşturma
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([]);
  const [activeTab, setActiveTab] = useState("tum-kullanicilar");
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [limit] = useState(10); // setLimit currently unused
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Ekran boyutunu izleme
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Helper function to map user type number to readable text
  const mapUserTypeToText = (userType: number): string => {
    switch (userType) {
      case -2: return "Genel";
      case -1: return "Sistem";
      case 0: return "Admin";
      case 1: return "Kurs Sahibi";
      case 2: return "Yönetici";
      case 3: return "Eğitmen";
      default: return `Tip ${userType}`;
    }
  };

  // Helper function to map process type to readable text
  const mapProcessToText = (process: number): string => {
    switch (process) {
      case 0: return "Sistem Girişi";
      case 1: return "Veri Ekleme";
      case 2: return "Veri Güncelleme";
      case 3: return "Veri Silme";
      case 4: return "Rapor İndirme";
      case 5: return "Simülatör İndirme";
      default: return `İşlem ${process}`;
    }
  };

  // Function to fetch logs from API
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      // Build query parameters based on active tab
      let userType;
      if (activeTab === "adminler") userType = 0;
      else if (activeTab === "kurs-sahipleri") userType = 1;
      else if (activeTab === "kurs-yoneticileri") userType = 2;
      
      // Make API call
      const response = await apiService.admin.getSystemLogs({
        page,
        limit,
        userType,
        // Add other filters if needed
      });
      
      const logsData: LogsResponse = response.data;
      
      // Process logs to add user names and readable types
      const processedLogs = logsData.data.map(log => ({
        ...log,
        // In a real app, you might want to fetch user names from another API
        // or they might be included in the response already
        userName: `Kullanıcı #${log.user_id}`
      }));
      
      setLogs(processedLogs);
      setTotal(logsData.total);
      setTotalPages(logsData.totalPages);
      
    } catch (error) {
      console.error("Logs could not be fetched:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh logs data
  const refreshLogs = () => {
    fetchLogs();
  };

  // Initial data load
  useEffect(() => {
    fetchLogs();
  }, [page, limit, activeTab]);

  // Handle filtering based on search text
  useEffect(() => {
    if (!filterText) {
      setFilteredLogs(logs);
      return;
    }
    
    const searchTerm = filterText.toLowerCase();
    const filtered = logs.filter(log => 
      log.userName?.toLowerCase().includes(searchTerm) ||
      log.description.toLowerCase().includes(searchTerm) ||
      mapProcessToText(log.process).toLowerCase().includes(searchTerm)
    );
    
    setFilteredLogs(filtered);
  }, [logs, filterText]);

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR')}`;
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Mobil kart bileşeni
  const LogCard = ({ log }: { log: SystemLog }) => (
    <div className={`mb-3 p-4 rounded-lg ${isDarkMode ? 'bg-[#1E2642] text-white' : 'bg-white text-gray-800'} shadow border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center mb-2">
        <User size={16} className="mr-2 text-gray-400 dark:text-gray-500" />
        <span className="font-medium">{log.userName}</span>
        <span className={`ml-auto px-2 py-1 text-xs font-semibold rounded-full ${
          isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
        }`}>
          {mapProcessToText(log.process)}
        </span>
      </div>
      
      <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        {mapUserTypeToText(log.user_type)}
      </div>
      
      <p className="text-sm mb-3 text-gray-600 dark:text-gray-300">
        {log.description}
      </p>
      
      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
        <Clock size={14} className="mr-1" />
        {formatDate(log.created_at)}
      </div>
    </div>
  );

  return (
    <div className="w-full px-4 py-6">
      <div className={`transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <h1 className="text-2xl font-semibold mb-6">İşlemler Geçmişi</h1>
        
        {/* Tabs - kaydırılabilir olması için overflow-x-auto ekledik */}
        <div className="overflow-x-auto mb-4">
          <div className={`flex border-b w-max min-w-full ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button 
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "tum-kullanicilar" 
                  ? "text-blue-500 border-b-2 border-blue-500" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              }`}
              onClick={() => setActiveTab("tum-kullanicilar")}
            >
              Tüm Kullanıcılar
            </button>
            <button 
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "adminler" 
                  ? "text-blue-500 border-b-2 border-blue-500" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              }`}
              onClick={() => setActiveTab("adminler")}
            >
              Adminler
            </button>
            <button 
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "kurs-sahipleri" 
                  ? "text-blue-500 border-b-2 border-blue-500" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              }`}
              onClick={() => setActiveTab("kurs-sahipleri")}
            >
              Kurs Sahipleri
            </button>
            <button 
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
                activeTab === "kurs-yoneticileri" 
                  ? "text-blue-500 border-b-2 border-blue-500" 
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              }`}
              onClick={() => setActiveTab("kurs-yoneticileri")}
            >
              Kurs Yöneticileri
            </button>
          </div>
        </div>
        
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter size={18} className="text-gray-500 dark:text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="İşlem veya kullanıcı ara..."
              className="border rounded-md pl-10 pr-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#1E2642] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white transition-colors"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          
          <button 
            className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            onClick={refreshLogs}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
            <span>Yenile</span>
          </button>
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Mobil görünüm için kartlar */}
        {!isLoading && isMobile && (
          <div className="space-y-1">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))
            ) : (
              <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Kayıt bulunamadı
              </div>
            )}
          </div>
        )}
        
        {/* Masaüstü görünüm için tablo */}
        {!isLoading && !isMobile && (
          <div className="rounded-lg shadow-sm border w-full overflow-x-auto bg-white dark:bg-[#161B2E] border-gray-200 dark:border-gray-700">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 dark:bg-[#1E2642]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Kullanıcı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Kullanıcı Tipi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">İşlem Tipi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Açıklama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Zaman</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-[#1A203A] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User size={16} className="mr-2 text-gray-400 dark:text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{log.userName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {mapUserTypeToText(log.user_type)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {mapProcessToText(log.process)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {log.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Clock size={16} className="mr-2 text-gray-400 dark:text-gray-500" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {isLoading ? "Yükleniyor..." : "Kayıt bulunamadı"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button 
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border rounded-md disabled:opacity-50 bg-white dark:bg-[#1E2642] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252F4F] transition-colors"
            >
              Önceki
            </button>
            
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Sayfa {page} / {totalPages}
            </div>
            
            <button 
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 border rounded-md disabled:opacity-50 bg-white dark:bg-[#1E2642] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252F4F] transition-colors"
            >
              Sonraki
            </button>
          </div>
        )}
        
        {/* Summary info */}
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between">
          <span>Toplam {total} kayıt ({filteredLogs.length} gösteriliyor)</span>
          <span>Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</span>
        </div>
      </div>
    </div>
  );
};

export default IslemlerGecmisi;
