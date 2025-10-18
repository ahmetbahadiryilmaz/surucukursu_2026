import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Filter, RefreshCw, UserPlus, CheckCircle, Edit, Trash2, Mail, Phone } from 'lucide-react';
import FormModal from './AdManOwFormModal';
import { useTheme } from "@/components/providers/ThemeProvider";
import { apiService } from '../../services/api-service';
import ToastService from "@/lib/toast"; // ToastService import edildi

// Admin tipi tanımlaması
type Admin = {
  id: number;
  ad: string;
  email: string;
  telefon: string;
  kurum: string;
  sehir: string;
  subeSayisi: number;
  durum: string;
  kayitTarihi: string;
};

// TypeScript için güncelleme verisi tipi tanımı
interface UpdateData {
  name: string;
  phone: string;
  company?: string;
  city?: string;
  branchCount?: number;
  isActive: boolean;
  password?: string;
}

// Düzenleme formu tipi
interface EditFormData {
  ad: string;
  email: string;
  telefon: string;
  kurum: string;
  sehir: string;
  subeSayisi: number;
  durum: string;
  password?: string;
}

const AdminTable = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();
  
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);
  const [filterText, setFilterText] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("Tümü");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Düzenleme için modal state'leri
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    ad: "",
    email: "",
    telefon: "",
    kurum: "",
    sehir: "",
    subeSayisi: 0,
    durum: "Aktif",
    password: ""
  });

  // Ekran boyutunu takip etme
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Location'dan gelen mesajı kontrol et
  useEffect(() => {
    if (location.state?.message) {
      ToastService.success(location.state.message); // alert yerine toast
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // API'den verileri çekme - Sayfa yüklendiğinde çalışacak
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await refreshAdmins();
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    loadInitialData();
  }, []);

  // API'den admin verilerini çekme
  const refreshAdmins = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    console.log("API çağrısı başlatılıyor...");
    
    // Loading toast başlat
    const toastId = ToastService.loading('Admin listesi yükleniyor...');
    
    try {
      console.log("apiService.admin.getAdmins() çağrılıyor...");
      const adminData = await apiService.admin.getAdmins();
      console.log("API'den gelen yanıt:", adminData);
      
      if (!adminData || !Array.isArray(adminData) || adminData.length === 0) {
        console.log("API'den veri gelmedi veya boş bir dizi döndü.");
        setAdmins([]);
        setFilteredAdmins([]);
        ToastService.updateLoading(toastId, 'Hiç admin bulunamadı', 'warning');
        return;
      }
      
      // API'den gelen verileri Admin tipine dönüştürme
      const formattedAdmins = adminData.map((admin: any) => {
        console.log("İşlenen admin verisi:", admin);
        return {
          id: admin.id,
          ad: admin.name || "İsimsiz",
          email: admin.email || "",
          telefon: admin.phone || "",
          kurum: admin.company || "Belirtilmemiş",
          sehir: admin.city || "Belirtilmemiş",
          subeSayisi: admin.branchCount || 0,
          durum: admin.isActive ? "Aktif" : "Pasif",
          kayitTarihi: admin.createdAt || new Date().toISOString()
        };
      });
      
      console.log("Düzenlenmiş admin verileri:", formattedAdmins);
      setAdmins(formattedAdmins);
      
      ToastService.updateLoading(toastId, `${formattedAdmins.length} admin başarıyla yüklendi`, 'success');
      console.log("Admin listesi başarıyla güncellendi");
    } catch (error: any) {
      console.error("Admin verileri çekilirken hata oluştu:", error);
      
      // Hata detaylarını daha iyi görmek için
      if (error instanceof Error) {
        console.error("Hata mesajı:", error.message);
        console.error("Hata stack:", error.stack);
      } else {
        console.error("Bilinmeyen hata tipi:", error);
      }
      
      // Hata mesajını belirle
      let errorMsg = "Admin verileri yüklenirken bir hata oluştu.";
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
      ToastService.updateLoading(toastId, errorMsg, 'error'); // alert yerine toast
      
      // Hata durumunda boş dizi ata
      setAdmins([]);
    } finally {
      console.log("API çağrısı tamamlandı, loading durumu kapatılıyor");
      setIsLoading(false);
    }
  };

  // Filtreleme işlemi
  useEffect(() => {
    console.log("Filtreleme çalıştı, admins:", admins);
    
    if (admins.length === 0) {
      setFilteredAdmins([]);
      return;
    }

    let result = [...admins];

    // Durum filtrelemesi
    if (selectedStatus !== "Tümü") {
      result = result.filter(admin => admin.durum === selectedStatus);
    }

    // Metin aramasına göre filtreleme
    if (filterText) {
      const searchTerm = filterText.toLowerCase();
      result = result.filter(admin =>
        admin.ad.toLowerCase().includes(searchTerm) ||
        admin.email.toLowerCase().includes(searchTerm) ||
        admin.telefon.toLowerCase().includes(searchTerm) ||
        admin.kurum.toLowerCase().includes(searchTerm) ||
        admin.sehir.toLowerCase().includes(searchTerm)
      );
    }

    console.log("Filtreleme sonucu:", result);
    setFilteredAdmins(result);
  }, [admins, filterText, selectedStatus]);

  // Tarih formatını düzenleyen yardımcı fonksiyon
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('tr-TR')}`;
  };

  // Detay sayfasına gitme
  const handleViewDetails = (id: number) => {
    navigate(`/admin/kullanicilar/adminler/${id}`);
  };

  // Düzenleme modalını açma
  const handleEdit = (admin: Admin, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentAdminId(admin.id);
    setEditForm({
      ad: admin.ad,
      email: admin.email,
      telefon: admin.telefon,
      kurum: admin.kurum,
      sehir: admin.sehir,
      subeSayisi: admin.subeSayisi,
      durum: admin.durum,
      password: ""
    });
    setIsEditModalOpen(true);
  };
  
  // Yeni ekleme modalını açma
  const handleAdd = () => {
    setEditForm({
      ad: "",
      email: "",
      telefon: "",
      kurum: "",
      sehir: "",
      subeSayisi: 0,
      durum: "Aktif",
      password: ""
    });
    setIsAddModalOpen(true);
  };

  // Düzenleme işlemini kaydetme
  const saveEdit = async () => {
    if (!currentAdminId) return;

    setIsLoading(true);
    setErrorMessage(null);
    
    // Loading toast başlat
    const toastId = ToastService.loading('Admin güncelleniyor...');
    
    try {
      // API formatına uygun güncelleme verisi oluştur
      const updateData: UpdateData = {
        name: editForm.ad,
        phone: editForm.telefon,
        company: editForm.kurum,
        city: editForm.sehir,
        branchCount: editForm.subeSayisi,
        isActive: true
      };
      
      // Şifre alanı doldurulmuşsa ekle
      if (editForm.password && editForm.password.trim() !== "") {
        updateData.password = editForm.password;
      }
      
      console.log("Gönderilecek güncelleme verisi:", updateData);
      
      // API çağrısı ile güncelleme
      await apiService.admin.updateAdmin(currentAdminId.toString(), updateData);
      
      // Başarılı güncelleme sonrası listeyi yenile
      await refreshAdmins();
      
      // Modalı kapat
      closeEditModal();
      
      ToastService.updateLoading(toastId, 'Admin bilgileri başarıyla güncellendi', 'success');
    } catch (error: any) {
      console.error("Admin güncellenirken hata oluştu:", error);
      
      // Hata mesajını belirle
      let errorMsg = "Admin güncellenirken bir hata oluştu.";
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
      ToastService.updateLoading(toastId, errorMsg, 'error'); // alert yerine toast
    } finally {
      setIsLoading(false);
    }
  };
  
  // Yeni admin ekleme işlemi
  const saveNewAdmin = async () => {
    // Form validasyonu
    if (!editForm.ad || !editForm.email || !editForm.telefon || !editForm.password) {
      ToastService.error("Ad, Email, Telefon ve Şifre alanları zorunludur");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    // Loading toast başlat
    const toastId = ToastService.loading('Yeni admin ekleniyor...');
    
    try {
      // API dökümantasyonundaki formata göre veri hazırlama
      const newAdminData = {
        name: editForm.ad,
        email: editForm.email,
        password: editForm.password,
        phone: editForm.telefon,
        company: editForm.kurum,
        city: editForm.sehir,
        branchCount: editForm.subeSayisi,
        isActive: true
      };
      
      console.log("Yeni admin verisi:", newAdminData);
      
      // API çağrısı ile yeni admin ekleme
      await apiService.admin.createAdmin(newAdminData);
      
      // Başarılı ekleme sonrası listeyi yenile
      await refreshAdmins();
      
      // Modalı kapat
      closeAddModal();
      
      ToastService.updateLoading(toastId, 'Yeni admin başarıyla eklendi', 'success');
    } catch (error: any) {
      console.error("Yeni admin eklenirken hata oluştu:", error);
      
      // Hata mesajını belirle
      let errorMsg = "Yeni admin eklenirken bir hata oluştu.";
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
      ToastService.updateLoading(toastId, errorMsg, 'error'); // alert yerine toast
    } finally {
      setIsLoading(false);
    }
  };

  // Modalları kapatma
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentAdminId(null);
    setErrorMessage(null);
  };
  
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setErrorMessage(null);
  };

  // Form alanlarındaki değişiklikleri izleme
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'subeSayisi') {
      setEditForm(prev => ({
        ...prev,
        [name]: parseInt(value, 10) || 0
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Silme işlemi
  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Onay için toast kullan (opsiyonel - confirm dialog da kullanılabilir)
    if (window.confirm("Bu admin kaydını silmek istediğinize emin misiniz?")) {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Loading toast başlat
      const toastId = ToastService.loading('Admin siliniyor...');
      
      try {
        // API çağrısı ile silme
        await apiService.admin.deleteAdmin(id.toString());
        
        // Başarılı silme sonrası listeyi yenile
        await refreshAdmins();
        
        ToastService.updateLoading(toastId, 'Admin başarıyla silindi', 'success');
      } catch (error: any) {
        console.error("Admin silinirken hata oluştu:", error);
        
        // Hata mesajını belirle
        let errorMsg = "Admin silinirken bir hata oluştu.";
        if (error instanceof Error) {
          errorMsg = error.message;
        }
        setErrorMessage(errorMsg);
        ToastService.updateLoading(toastId, errorMsg, 'error'); // alert yerine toast
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Render kısmı değişmedi - sadece ToastService import ve kullanımlar eklendi
  console.log("Render öncesi durumlar:", {
    isLoading,
    isInitialLoading,
    adminsLength: admins.length,
    filteredLength: filteredAdmins.length
  });

  return (
    <div className="container px-4 md:px-6">
      <div className="flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold flex items-center">
            <User className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Admin Listesi
          </h1>
          <div className="flex space-x-2">
            <button
              onClick={refreshAdmins}
              className="inline-flex items-center px-3 py-2 md:px-4 md:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 md:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="md:inline">Yenile</span>
            </button>
            <button
              onClick={handleAdd}
              className="inline-flex items-center px-3 py-2 md:px-4 md:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              disabled={isLoading}
            >
              <UserPlus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="md:inline">Yeni Admin</span>
            </button>
          </div>
        </div>

        {/* Filtreleme alanı */}
        <div className={`p-3 md:p-4 mb-4 md:mb-6 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 text-sm ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500'
                }`}
                placeholder="Ad, E-posta, Telefon, Kurum veya Şehir ile ara..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <div className="flex-shrink-0">
              <select
                className={`block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none text-sm ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white focus:ring-blue-500 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="Tümü">Tüm Durumlar</option>
                <option value="Aktif">Aktif</option>
                <option value="Pasif">Pasif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Hata mesajı - Bu kısım da toast olabilir ama fallback olarak bırakabiliriz */}
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 md:px-4 md:py-3 rounded mb-4 text-sm">
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Yükleniyor göstergesi */}
        {(isInitialLoading || isLoading) && (
          <div className="flex justify-center my-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Mobil ekranlar için kart görünümü */}
        {!isInitialLoading && !isLoading && isMobile && (
          <div className="space-y-3">
            {filteredAdmins.length > 0 ? (
              filteredAdmins.map((admin) => (
                <div 
                  key={admin.id} 
                  className={`p-4 rounded-lg shadow-sm cursor-pointer ${
                    isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}
                  onClick={() => handleViewDetails(admin.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
                        <User size={18} className="text-red-600" />
                      </div>
                      <div className="ml-3">
                        <div className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {admin.ad}
                        </div>
                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {admin.kurum}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 inline-flex items-center text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                      <CheckCircle size={12} className="mr-1" />
                      Aktif
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <Mail size={14} className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{admin.email}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone size={14} className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{admin.telefon}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Kayıt: {formatDate(admin.kayitTarihi)}
                    </div>
                    <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`px-2 py-1 rounded text-xs flex items-center ${
                          isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(admin, e);
                        }}
                      >
                        <Edit size={12} className="mr-1" />
                        <span>Düzenle</span>
                      </button>
                      <button
                        className={`px-2 py-1 rounded text-xs flex items-center ${
                          isDarkMode 
                            ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' 
                            : 'bg-red-100 hover:bg-red-200 text-red-700'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(admin.id, e);
                        }}
                      >
                        <Trash2 size={12} className="mr-1" />
                        <span>Sil</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className={`p-6 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} bg-opacity-50 rounded-lg ${
                isDarkMode ? 'bg-gray-800' : 'bg-white'
              } shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                Gösterilecek admin bulunamadı
              </div>
            )}
          </div>
        )}

        {/* Masaüstü ekranlar için tablo görünümü */}
        {!isInitialLoading && !isLoading && !isMobile && (
          <div className="overflow-x-auto rounded-lg border">
            <table className={`min-w-full divide-y ${isDarkMode ? 'bg-gray-800 divide-gray-700 border-gray-700' : 'bg-white divide-gray-200 border-gray-200'}`}>
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Ad & İletişim
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Durum
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Kayıt Tarihi
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center">
                      Gösterilecek admin kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredAdmins.map((admin) => (
                    <tr 
                      key={admin.id} 
                      className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer`}
                      onClick={() => handleViewDetails(admin.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="rounded-full w-10 h-10 flex items-center justify-center bg-red-100 text-red-600">
                            {admin.ad.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{admin.ad}</div>
                            <div className="text-sm text-gray-500">{admin.email}</div>
                            <div className="text-sm text-gray-500">{admin.telefon}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Aktif
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(admin.kayitTarihi)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => handleEdit(admin, e)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(admin.id, e)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Durum çubuğu */}
        <div className={`mt-4 md:mt-6 text-xs md:text-sm flex flex-col md:flex-row md:justify-between md:items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <span>Toplam {filteredAdmins.length} admin gösteriliyor</span>
          <span>Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</span>
        </div>
      </div>

      {/* Düzenleme Modalı */}
      <FormModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSave={saveEdit}
        title="Admin Düzenle"
        formData={editForm}
        onChange={handleFormChange}
        color="blue"
      />

      {/* Ekleme Modalı */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSave={saveNewAdmin}
        title="Yeni Admin Ekle"
        formData={editForm}
        onChange={handleFormChange}
        color="green"
        isNewAdmin={true}
      />
    </div>
  );
};

export default AdminTable;
