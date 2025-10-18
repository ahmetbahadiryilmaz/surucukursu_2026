import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Filter, RefreshCw, UserPlus, CheckCircle, Car, MapPin, Edit, Trash2, Phone, Mail } from 'lucide-react';
import FormModal from './AdManOwFormModal';
import { useTheme } from "@/components/providers/ThemeProvider";
import { apiService } from '../../services/api-service';
import ToastService from "@/lib/toast"; // ToastService import edildi

// Kurum sahibi tipi tanımlaması
type DSOwner = {
  id: number;
  ad: string;
  email: string;
  telefon: string;
  kurum: string;
  sehir: string;
  subeSayisi: number;
  durum: string;
  gercekDurum: string; // Gerçek durum bilgisini saklamak için
  kayitTarihi: string;
};

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

const DSOwnerTable = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();
  
  const [owners, setOwners] = useState<DSOwner[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<DSOwner[]>([]);
  const [filterText, setFilterText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Düzenleme için modal state'leri
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [currentOwnerId, setCurrentOwnerId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    ad: "",
    email: "",
    telefon: "",
    kurum: "",
    sehir: "",
    subeSayisi: 0,
    durum: "Aktif",
    password: "default123"
  });

  // Ekran boyutunu takip etme
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // API'den verileri çekme - Sayfa yüklendiğinde çalışacak
  useEffect(() => {
    refreshOwners();
  }, []);

  // API'den kurum sahipleri verilerini çekme
  const refreshOwners = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    
    // Loading toast başlat
    const toastId = ToastService.loading('Kurum sahipleri yükleniyor...');
    
    try {
      console.log("API çağrısı yapılıyor...");
      const ownerData = await apiService.admin.getDrivingSchoolOwners();
      console.log("API sonucu:", ownerData);
      
      if (!ownerData || !Array.isArray(ownerData) || ownerData.length === 0) {
        setOwners([]);
        setFilteredOwners([]);
        ToastService.updateLoading(toastId, 'Hiç kurum sahibi bulunamadı', 'warning');
        return;
      }
      
      // API'den gelen verileri DSOwner tipine dönüştürme
      const formattedOwners = ownerData.map((owner: any) => {
        // Gerçek durum bilgisini sakla
        const isActive = owner.isActive; 
        
        return {
          id: owner.id,
          ad: owner.name || "İsimsiz",
          email: owner.email || "",
          telefon: owner.phone || "",
          kurum: owner.company || "Belirtilmemiş",
          sehir: owner.city || "Belirtilmemiş",
          subeSayisi: owner.branchCount || 0,
          durum: "Aktif", // Pasif olanları da Aktif göster
          gercekDurum: isActive ? "Aktif" : "Pasif", // Gerçek durumu sakla
          kayitTarihi: owner.createdAt || new Date().toISOString()
        };
      });
      
      setOwners(formattedOwners);
      setFilteredOwners(formattedOwners);
      
      ToastService.updateLoading(toastId, `${formattedOwners.length} kurum sahibi başarıyla yüklendi`, 'success');
    } catch (error: any) {
      console.error("Kurum sahipleri verileri çekilirken hata oluştu:", error);
      
      // Hata mesajını belirle
      let errorMsg = "Kurum sahipleri verileri yüklenirken bir hata oluştu.";
      if (error.response && error.response.data && error.response.data.message) {
        errorMsg = error.response.data.message;
      } else if (typeof error.message === 'string') {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
      ToastService.updateLoading(toastId, errorMsg, 'error'); // alert yerine toast
    } finally {
      setIsLoading(false);
    }
  };

  // Filtreleme işlemi
  useEffect(() => {
    let result = owners;

    // Metin aramasına göre filtreleme
    if (filterText) {
      const searchTerm = filterText.toLowerCase();
      result = result.filter(owner =>
        owner.ad.toLowerCase().includes(searchTerm) ||
        owner.email.toLowerCase().includes(searchTerm) ||
        owner.telefon.toLowerCase().includes(searchTerm) ||
        owner.kurum.toLowerCase().includes(searchTerm) ||
        owner.sehir.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredOwners(result);
  }, [owners, filterText]);

  // Tarih formatını düzenleyen yardımcı fonksiyon
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('tr-TR')}`;
  };

  // Düzenleme modalını açma
  const handleEdit = (owner: DSOwner) => {
    setCurrentOwnerId(owner.id);
    setEditForm({
      ad: owner.ad,
      email: owner.email,
      telefon: owner.telefon,
      kurum: owner.kurum,
      sehir: owner.sehir,
      subeSayisi: owner.subeSayisi,
      durum: owner.gercekDurum, // Gerçek durum bilgisini kullan
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
      password: "default123"
    });
    setIsAddModalOpen(true);
  };

  // Detay sayfasına gitme
  const handleViewDetails = (id: number) => {
    navigate(`/admin/kullanicilar/ds-owner/${id}`);
  };

  // Düzenleme işlemini kaydetme
  const saveEdit = async () => {
    if (!currentOwnerId) return;

    setIsLoading(true);
    setErrorMessage(null);
    
    // Loading toast başlat
    const toastId = ToastService.loading('Kurum sahibi güncelleniyor...');
    
    try {
      // UpdateOwnerDto şemasına göre veri hazırlama
      const updateData: any = {
        name: editForm.ad,
        email: editForm.email,
        phone: editForm.telefon
      };
      
      // Şifre alanı doldurulmuşsa ekle
      if (editForm.password && editForm.password.trim() !== "") {
        updateData.password = editForm.password;
      }
      
      console.log("Gönderilecek veri:", updateData);
      
      // API çağrısı ile güncelleme
      await apiService.admin.updateDrivingSchoolOwner(currentOwnerId.toString(), updateData);
      
      // Başarılı güncelleme sonrası listeyi yenile
      await refreshOwners();
      
      // Modalı kapat
      closeEditModal();
      
      ToastService.updateLoading(toastId, 'Kurum sahibi bilgileri başarıyla güncellendi', 'success');
    } catch (error: any) {
      console.error("Kurum sahibi güncellenirken hata oluştu:", error);
      
      // Hata mesajını belirle
      let errorMsg = "Kurum sahibi güncellenirken bir hata oluştu.";
      if (error.response && error.response.data && error.response.data.message) {
        errorMsg = error.response.data.message;
      } else if (typeof error.message === 'string') {
        errorMsg = error.message;
      }
      setErrorMessage(errorMsg);
      ToastService.updateLoading(toastId, errorMsg, 'error'); // alert yerine toast
    } finally {
      setIsLoading(false);
    }
  };
  
  // Yeni kurum sahibi ekleme işlemi
  const saveNewOwner = async () => {
    // Form validasyonu
    if (!editForm.ad || !editForm.email || !editForm.telefon) {
      ToastService.error("Ad, Email ve Telefon alanları zorunludur");
      return;
    }
    
    setIsLoading(true);
    setErrorMessage(null);
    
    // Loading toast başlat
    const toastId = ToastService.loading('Yeni kurum sahibi ekleniyor...');
    
    try {
      // CreateOwnerDto şemasına göre veri hazırlama
      const newOwnerData = {
        name: editForm.ad,
        email: editForm.email,
        password: editForm.password || "default123",
        phone: editForm.telefon
      };
      
      console.log("Yeni kurum sahibi verisi:", newOwnerData);
      
      // API çağrısı ile yeni kurum sahibi ekleme
      await apiService.admin.createDrivingSchoolOwner(newOwnerData);
      
      // Başarılı ekleme sonrası listeyi yenile
      await refreshOwners();
      
      // Modalı kapat
      closeAddModal();
      
      ToastService.updateLoading(toastId, 'Yeni kurum sahibi başarıyla eklendi', 'success');
    } catch (error: any) {
      console.error("Yeni kurum sahibi eklenirken hata oluştu:", error);
      
      // Hata mesajını belirle
      let errorMsg = "Yeni kurum sahibi eklenirken bir hata oluştu.";
      if (error.response && error.response.data && error.response.data.message) {
        errorMsg = error.response.data.message;
      } else if (typeof error.message === 'string') {
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
    setCurrentOwnerId(null);
    setErrorMessage(null);
  };
  
  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setErrorMessage(null);
  };

  // Form alanlarındaki değişiklikleri izleme
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // subeSayisi için sayısal dönüşüm yapılıyor
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
  const handleDelete = async (id: number) => {
    if (window.confirm("Bu kurum sahibini silmek istediğinize emin misiniz?")) {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Loading toast başlat
      const toastId = ToastService.loading('Kurum sahibi siliniyor...');
      
      try {
        // API çağrısı ile silme - deleteDrivingSchoolOwner kullanılıyor
        await apiService.admin.deleteDrivingSchoolOwner(id.toString());
        
        // Başarılı silme sonrası listeyi yenile
        await refreshOwners();
        
        ToastService.updateLoading(toastId, 'Kurum sahibi başarıyla silindi', 'success');
      } catch (error: any) {
        console.error("Kurum sahibi silinirken hata oluştu:", error);
        
        // Hata mesajını belirle
        let errorMsg = "Kurum sahibi silinirken bir hata oluştu.";
        if (error.response && error.response.data && error.response.data.message) {
          errorMsg = error.response.data.message;
        } else if (typeof error.message === 'string') {
          errorMsg = error.message;
        }
        setErrorMessage(errorMsg);
        ToastService.updateLoading(toastId, errorMsg, 'error'); // alert yerine toast
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className={`w-full p-3 md:p-6 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'} transition-colors duration-200`}>
      <h1 className={`text-xl md:text-3xl font-bold mb-4 md:mb-8 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Sürücü Kursu Sahipleri</h1>

      {/* Hata mesajı gösterimi - fallback olarak bırakabiliriz */}
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 md:px-4 md:py-3 rounded mb-4 relative text-sm">
          <strong className="font-bold">Hata! </strong>
          <span className="block sm:inline">{errorMessage}</span>
        </div>
      )}

      {/* Araç çubuğu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-3">
        <div className="flex items-center w-full">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter size={16} className={isDarkMode ? "text-gray-400" : "text-gray-500"} />
            </div>
            <input
              type="text"
              placeholder="Ad, email, telefon, kurum veya şehir ara..."
              className={`border rounded-lg pl-10 pr-3 py-2 md:py-3 w-full focus:outline-none focus:ring-2 text-sm ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white focus:ring-blue-500 placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-500 placeholder-gray-400'
              } transition-colors duration-200`}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>

        <div className="flex mt-3 sm:mt-0 gap-2">
          <button
            className="flex items-center justify-center space-x-1 md:space-x-2 bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-xs md:text-sm flex-1 sm:flex-none"
            onClick={handleAdd}
          >
            <UserPlus size={16} className="mr-1 md:mr-2" />
            <span>Yeni Ekle</span>
          </button>
          <button
            className="flex items-center justify-center space-x-1 md:space-x-2 bg-blue-600 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-xs md:text-sm flex-1 sm:flex-none"
            onClick={refreshOwners}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={`${isLoading ? "animate-spin" : ""}`} />
            <span className="ml-1 md:ml-2">Yenile</span>
          </button>
        </div>
      </div>

      {/* Yükleniyor göstergesi */}
      {isLoading && (
        <div className="flex justify-center my-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Mobil ekranlar için kart görünümü */}
      {!isLoading && isMobile && (
        <div className="space-y-3">
          {filteredOwners.length > 0 ? (
            filteredOwners.map((owner) => (
              <div 
                key={owner.id} 
                className={`p-4 rounded-lg shadow-sm cursor-pointer ${
                  isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}
                onClick={() => handleViewDetails(owner.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={18} className="text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <div className={`text-base font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {owner.ad}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {owner.kurum}
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
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{owner.email}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Phone size={14} className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{owner.telefon}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <MapPin size={14} className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{owner.sehir}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Car size={14} className={`mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{owner.subeSayisi} Şube</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Kayıt: {formatDate(owner.kayitTarihi)}
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
                        handleEdit(owner);
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
                        handleDelete(owner.id);
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
              Gösterilecek kurum sahibi bulunamadı
            </div>
          )}
        </div>
      )}

      {/* Masaüstü ekranlar için tablo görünümü */}
      {!isLoading && !isMobile && (
        <div className={`border rounded-xl overflow-hidden shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} transition-colors duration-200`}>
          <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            <thead className={isDarkMode ? "bg-gray-700/70" : "bg-gray-50"}>
              <tr>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Kurum Sahibi</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>İletişim Bilgileri</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Kurum Bilgileri</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Durum</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Kayıt Tarihi</th>
                <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>İşlemler</th>
              </tr>
            </thead>
            <tbody className={`${isDarkMode ? 'divide-y divide-gray-700' : 'divide-y divide-gray-200'}`}>
              {filteredOwners.length > 0 ? (
                filteredOwners.map((owner) => (
                  <tr 
                    key={owner.id} 
                    className={`${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors duration-150 cursor-pointer`}
                    onClick={() => handleViewDetails(owner.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center shadow-sm">
                          <User size={18} className="text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{owner.ad}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{owner.email}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{owner.telefon}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>{owner.kurum}</div>
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex flex-wrap items-center gap-3`}>
                        <span className="flex items-center">
                          <MapPin size={14} className="mr-1" />
                          {owner.sehir}
                        </span>
                        <span className="flex items-center">
                          <Car size={14} className="mr-1" />
                          {owner.subeSayisi} Şube
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1.5 inline-flex items-center text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400">
                        <CheckCircle size={14} className="mr-1" />
                        Aktif
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {formatDate(owner.kayitTarihi)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                            isDarkMode 
                              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                          } transition-colors`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(owner);
                          }}
                        >
                          <Edit size={14} className="mr-1" />
                          <span>Düzenle</span>
                        </button>
                        <button
                          className={`px-3 py-1.5 rounded-md text-sm flex items-center ${
                            isDarkMode 
                              ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400' 
                              : 'bg-red-100 hover:bg-red-200 text-red-700'
                          } transition-colors`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(owner.id);
                          }}
                        >
                          <Trash2 size={14} className="mr-1" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={`px-6 py-8 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Gösterilecek kurum sahibi bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Durum çubuğu */}
      <div className={`mt-4 md:mt-6 text-xs md:text-sm flex flex-col md:flex-row md:justify-between md:items-center gap-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <span>Toplam {filteredOwners.length} kurum sahibi gösteriliyor</span>
        <span>Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</span>
      </div>

      {/* Düzenleme Modalı */}
      <FormModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSave={saveEdit}
        title="Kurum Sahibi Düzenle"
        formData={editForm}
        onChange={handleFormChange}
        color="blue"
      />
      
      {/* Yeni Ekleme Modalı */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        onSave={saveNewOwner}
        title="Yeni Kurum Sahibi Ekle"
        formData={editForm}
        onChange={handleFormChange}
        color="blue"
      />
    </div>
  );
};

export default DSOwnerTable;
