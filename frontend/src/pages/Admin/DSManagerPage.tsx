import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Filter, RefreshCw, UserPlus, CheckCircle, XCircle, Car, MapPin, Edit, Trash2, Phone, Mail } from 'lucide-react';
import FormModal from './AdManOwFormModal';
import { useTheme } from "@/components/providers/ThemeProvider";
import { apiService } from '../../services/api-service';
import ToastService from "@/lib/toast";

// Driving School Manager tipi tanımlaması
type DSManager = {
  id: number;
  ad: string;
  email: string;
  telefon: string;
  kurum: string;
  sehir: string;
  pozisyon: string;
  durum: string;
  gercekDurum: string;
  kayitTarihi: string;
};

// Düzenleme formu tipi
interface EditFormData {
  ad: string;
  email: string;
  telefon: string;
  kurum: string;
  sehir: string;
  pozisyon: string;
}

const DSManagerPage = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const navigate = useNavigate();
  
  const [managers, setManagers] = useState<DSManager[]>([]);
  const [filteredManagers, setFilteredManagers] = useState<DSManager[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingManager, setEditingManager] = useState<DSManager | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [formData, setFormData] = useState<EditFormData>({
    ad: '',
    email: '',
    telefon: '',
    kurum: '',
    sehir: '',
    pozisyon: ''
  });

  // Ekran boyutunu izleme
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Managers verilerini getir
  const fetchManagers = async () => {
    setIsLoading(true);
    try {
      // API'den manager verilerini çek
      const response = await apiService.admin.getDrivingSchoolManagers();
      
      // Veriyi uygun formata çevir
      const managersData = response.map((user: any) => ({
        id: user.id,
        ad: user.name || `Manager ${user.id}`,
        email: user.email || '',
        telefon: user.phone || '',
        kurum: user.institution || '',
        sehir: user.city || '',
        pozisyon: user.position || 'Manager',
        durum: user.status === 'active' ? 'Aktif' : 'Pasif',
        gercekDurum: user.status,
        kayitTarihi: user.createdAt || new Date().toISOString()
      }));
      
      setManagers(managersData);
      setFilteredManagers(managersData);
      
    } catch (error) {
      console.error("Managers could not be fetched:", error);
      ToastService.error("Manager verileri yüklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    fetchManagers();
  }, []);

  // Filtreleme
  useEffect(() => {
    if (!filterText) {
      setFilteredManagers(managers);
      return;
    }
    
    const searchTerm = filterText.toLowerCase();
    const filtered = managers.filter(manager => 
      manager.ad.toLowerCase().includes(searchTerm) ||
      manager.email.toLowerCase().includes(searchTerm) ||
      manager.kurum.toLowerCase().includes(searchTerm) ||
      manager.sehir.toLowerCase().includes(searchTerm)
    );
    
    setFilteredManagers(filtered);
  }, [managers, filterText]);

  // Manager durumu güncelle
  const toggleManagerStatus = async (managerId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      await apiService.admin.updateDrivingSchoolManager(managerId.toString(), {
        status: newStatus
      });
      
      // Local state'i güncelle
      const updatedManagers = managers.map(manager => 
        manager.id === managerId 
          ? { 
              ...manager, 
              durum: newStatus === 'active' ? 'Aktif' : 'Pasif',
              gercekDurum: newStatus 
            }
          : manager
      );
      
      setManagers(updatedManagers);
      ToastService.success(`Manager durumu ${newStatus === 'active' ? 'aktif' : 'pasif'} olarak güncellendi`);
      
    } catch (error) {
      console.error("Manager durumu güncellenirken hata:", error);
      ToastService.error("Manager durumu güncellenirken bir hata oluştu");
    }
  };

  // Manager sil
  const deleteManager = async (managerId: number) => {
    if (!confirm('Bu manager\'ı silmek istediğinizden emin misiniz?')) return;
    // Show loading toast
    const toastId = ToastService.loading('Manager siliniyor...');
    try {
      await apiService.admin.deleteDrivingSchoolManager(managerId.toString());
      
      const updatedManagers = managers.filter(manager => manager.id !== managerId);
      setManagers(updatedManagers);
      ToastService.updateLoading(toastId, 'Manager başarıyla silindi', 'success');
      
    } catch (error) {
      console.error("Manager silinirken hata:", error);
      ToastService.updateLoading(toastId, 'Manager silinirken bir hata oluştu', 'error');
    }
  };

  // Manager düzenle
  const handleEditManager = (manager: DSManager) => {
    setEditingManager(manager);
    setFormData({
      ad: manager.ad,
      email: manager.email,
      telefon: manager.telefon,
      kurum: manager.kurum,
      sehir: manager.sehir,
      pozisyon: manager.pozisyon
    });
    setIsFormModalOpen(true);
  };

  // Form değişiklik handler'ı
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Detay sayfasına git
  const handleViewDetails = (managerId: number) => {
    navigate(`/admin/kullanicilar/ds-manager/detay/${managerId}`);
  };

  // Form save handler
  const handleFormSave = async () => {
    try {
      if (editingManager) {
        // Güncelleme
        await apiService.admin.updateDrivingSchoolManager(editingManager.id.toString(), {
          name: formData.ad,
          email: formData.email,
          phone: formData.telefon,
          institution: formData.kurum,
          city: formData.sehir,
          position: formData.pozisyon
        });
        
        ToastService.success("Manager başarıyla güncellendi");
      } else {
        // Yeni ekleme
        await apiService.admin.createDrivingSchoolManager({
          name: formData.ad,
          email: formData.email,
          phone: formData.telefon,
          institution: formData.kurum,
          city: formData.sehir,
          position: formData.pozisyon
        });
        
        ToastService.success("Yeni manager başarıyla eklendi");
      }
      
      fetchManagers(); // Listeyi yenile
      setIsFormModalOpen(false);
      setEditingManager(null);
      
    } catch (error) {
      console.error("Form submit hatası:", error);
      ToastService.error("İşlem sırasında bir hata oluştu");
    }
  };

  // Manager kartı (mobil görünüm)
  const ManagerCard = ({ manager }: { manager: DSManager }) => (
    <div className={`mb-3 p-4 rounded-lg ${isDarkMode ? 'bg-[#1E2642] text-white' : 'bg-white text-gray-800'} shadow border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <User size={20} className="mr-2 text-gray-400" />
          <span className="font-semibold">{manager.ad}</span>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
          manager.gercekDurum === 'active' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {manager.durum}
        </span>
      </div>
      
      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 mb-3">
        <div className="flex items-center">
          <Mail size={14} className="mr-2" />
          {manager.email}
        </div>
        <div className="flex items-center">
          <Phone size={14} className="mr-2" />
          {manager.telefon}
        </div>
        <div className="flex items-center">
          <Car size={14} className="mr-2" />
          {manager.kurum}
        </div>
        <div className="flex items-center">
          <MapPin size={14} className="mr-2" />
          {manager.sehir}
        </div>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={() => handleViewDetails(manager.id)}
          className="flex-1 bg-blue-500 text-white py-1 px-2 rounded text-sm hover:bg-blue-600"
        >
          Detay
        </button>
        <button 
          onClick={() => handleEditManager(manager)}
          className="flex-1 bg-gray-500 text-white py-1 px-2 rounded text-sm hover:bg-gray-600"
        >
          Düzenle
        </button>
        <button 
          onClick={() => toggleManagerStatus(manager.id, manager.gercekDurum)}
          className={`flex-1 py-1 px-2 rounded text-sm ${
            manager.gercekDurum === 'active' 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
        >
          {manager.gercekDurum === 'active' ? 'Pasifleştir' : 'Aktifleştir'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full px-4 py-6">
      <div className={`transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <h1 className="text-2xl font-semibold mb-6">Driving School Manager'ları</h1>
        
        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row justify-between mb-4 gap-4">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Filter size={18} className="text-gray-500 dark:text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Manager ara..."
              className="border rounded-md pl-10 pr-3 py-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-[#1E2642] border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white transition-colors"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <button 
              className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
              onClick={fetchManagers}
              disabled={isLoading}
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
              <span>Yenile</span>
            </button>
            
            <button 
              className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
              onClick={() => {
                setEditingManager(null);
                setFormData({
                  ad: '',
                  email: '',
                  telefon: '',
                  kurum: '',
                  sehir: '',
                  pozisyon: ''
                });
                setIsFormModalOpen(true);
              }}
            >
              <UserPlus size={18} />
              <span>Yeni Manager</span>
            </button>
          </div>
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Mobile view - Cards */}
        {!isLoading && isMobile && (
          <div className="space-y-1">
            {filteredManagers.length > 0 ? (
              filteredManagers.map((manager) => (
                <ManagerCard key={manager.id} manager={manager} />
              ))
            ) : (
              <div className={`p-4 text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Manager bulunamadı
              </div>
            )}
          </div>
        )}
        
        {/* Desktop view - Table */}
        {!isLoading && !isMobile && (
          <div className="rounded-lg shadow-sm border w-full overflow-x-auto bg-white dark:bg-[#161B2E] border-gray-200 dark:border-gray-700">
            <table className="w-full table-auto">
              <thead className="bg-gray-50 dark:bg-[#1E2642]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Manager</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">İletişim</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Kurum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Şehir</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">Durum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-300">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredManagers.length > 0 ? (
                  filteredManagers.map((manager) => (
                    <tr key={manager.id} className="hover:bg-gray-50 dark:hover:bg-[#1A203A] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User size={20} className="mr-3 text-gray-400 dark:text-gray-500" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{manager.ad}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">ID: {manager.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{manager.email}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{manager.telefon}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {manager.kurum}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {manager.sehir}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          manager.gercekDurum === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {manager.durum}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleViewDetails(manager.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Detayları Görüntüle"
                          >
                            <User size={16} />
                          </button>
                          <button 
                            onClick={() => handleEditManager(manager)}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                            title="Düzenle"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => toggleManagerStatus(manager.id, manager.gercekDurum)}
                            className={`${
                              manager.gercekDurum === 'active' 
                                ? 'text-red-600 hover:text-red-900 dark:text-red-400' 
                                : 'text-green-600 hover:text-green-900 dark:text-green-400'
                            }`}
                            title={manager.gercekDurum === 'active' ? 'Pasifleştir' : 'Aktifleştir'}
                          >
                            {manager.gercekDurum === 'active' ? <XCircle size={16} /> : <CheckCircle size={16} />}
                          </button>
                          <button 
                            onClick={() => deleteManager(manager.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Manager bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Summary info */}
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between">
          <span>Toplam {managers.length} manager ({filteredManagers.length} gösteriliyor)</span>
          <span>Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}</span>
        </div>
      </div>
      
      {/* Form Modal */}
      <FormModal 
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingManager(null);
          setFormData({
            ad: '',
            email: '',
            telefon: '',
            kurum: '',
            sehir: '',
            pozisyon: ''
          });
        }}
        onSave={handleFormSave}
        formData={formData}
        onChange={handleFormChange}
        title={editingManager ? "Manager Düzenle" : "Yeni Manager Ekle"}
        color="blue"
        isNewAdmin={!editingManager}
      />
    </div>
  );
};

export default DSManagerPage;
