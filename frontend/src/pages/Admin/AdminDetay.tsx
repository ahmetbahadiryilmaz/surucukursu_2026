import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Mail, Phone, Building2, Calendar, 
  Clock, MapPin, Edit, Trash2, CheckCircle, XCircle
} from "lucide-react";
import { apiService } from '../../services/api-service';
import FormModal from './AdManOwFormModal';
import { useTheme } from "@/components/providers/ThemeProvider";

// Admin detay tipi
export type AdminDetail = {
  id: number;
  name: string;
  email: string;
  phone: string;
  institution: string;
  status: 'active' | 'inactive';
  address: string;
  city: string;
  joinDate: string;
  lastLogin: string;
  branchCount: number;
  activities: Array<{
    date: string;
    action: string;
  }>;
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

const AdminDetay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [admin, setAdmin] = useState<AdminDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'activities'>('activities');
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
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
  // Ekran boyutu durumu
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // Ekran boyutunu izle
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
      alert(location.state.message);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    fetchAdmin();
  }, [id]);

  // Admin detaylarını getir
  const fetchAdmin = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    try {
      // YENİ METOT
      const adminData = await apiService.admin.getAdminById(id);
      
      if (adminData) {
        const formattedAdmin: AdminDetail = {
          id: adminData.id,
          name: adminData.name || "İsimsiz",
          email: adminData.email || "",
          phone: adminData.phone || "",
          institution: adminData.company || "Belirtilmemiş",
          status: adminData.isActive ? 'active' : 'inactive',
          address: adminData.address || "",
          city: adminData.city || "Belirtilmemiş",
          joinDate: adminData.createdAt || new Date().toISOString(),
          lastLogin: adminData.lastLogin || new Date().toISOString(),
          branchCount: adminData.branchCount || 0,
          activities: adminData.activities || [
            { date: new Date().toISOString(), action: "Sisteme giriş yapıldı" },
            { date: new Date(Date.now() - 86400000).toISOString(), action: "Profil güncellendi" }
          ]
        };
        
        setAdmin(formattedAdmin);
        
        // Edit formunu doldur
        setEditForm({
          ad: formattedAdmin.name,
          email: formattedAdmin.email,
          telefon: formattedAdmin.phone,
          kurum: formattedAdmin.institution,
          sehir: formattedAdmin.city,
          subeSayisi: formattedAdmin.branchCount,
          durum: formattedAdmin.status === 'active' ? "Aktif" : "Pasif",
          password: ""
        });
      } else {
        setError("Admin detayları bulunamadı");
        alert("Admin detayları bulunamadı");
      }
    } catch (error) {
      console.error("Admin detayları alınırken hata oluştu:", error);
      let errorMsg = "Admin detayları yüklenirken bir hata oluştu.";
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Admin silme işlemi
  const handleDelete = async () => {
    if (!id || !admin) return;
    
    if (window.confirm(`"${admin.name}" adlı admini silmek istediğinize emin misiniz?`)) {
      try {
        setLoading(true);
        setError(null);
        
        // YENİ METOT
        await apiService.admin.deleteAdmin(id);
        
        alert("Admin başarıyla silindi");
        
        navigate('/admin/kullanicilar/adminler', { 
          state: { message: "Admin başarıyla silindi" } 
        });
      } catch (error) {
        console.error("Admin silinirken hata oluştu:", error);
        let errorMsg = "Admin silinirken bir hata oluştu.";
        if (error instanceof Error) {
          errorMsg = error.message;
        }
        setError(errorMsg);
        setLoading(false);
        alert(errorMsg);
      }
    }
  };

  // Düzenleme modalını aç
  const handleEdit = () => {
    setIsEditModalOpen(true);
  };
  
// Düzenleme işlemini kaydet
const saveEdit = async () => {
  if (!id) return;

  setLoading(true);
  setError(null);
  try {
    // API formatına uygun güncelleme verisi oluştur
    const updateData: UpdateData = {
      name: editForm.ad,
      phone: editForm.telefon,
      company: editForm.kurum,
      city: editForm.sehir,
      branchCount: editForm.subeSayisi,
      isActive: editForm.durum === "Aktif"
    };
    
    // Şifre alanı doldurulmuşsa ekle
    if (editForm.password && editForm.password.trim() !== "") {
      updateData.password = editForm.password;
    }
    
    console.log("Gönderilecek güncelleme verisi:", updateData);
    
    // YENİ METOT
    await apiService.admin.updateAdmin(id, updateData);
    await fetchAdmin();
    closeEditModal();
    
    alert("Admin bilgileri güncellendi");
  } catch (error) {
    console.error("Admin güncellenirken hata oluştu:", error);
    let errorMsg = "Admin güncellenirken bir hata oluştu.";
    if (error instanceof Error) {
      errorMsg = error.message;
    }
    setError(errorMsg);
    alert(errorMsg);
  } finally {
    setLoading(false);
  }
};

// Modalı kapat
const closeEditModal = () => {
  setIsEditModalOpen(false);
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

// Avatar baş harflerini alma
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

// Tarih formatlaması
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  } catch (error) {
    return "Geçersiz tarih";
  }
};

if (loading) {
  return (
    <div className="container flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500"></div>
    </div>
  );
}

if (error) {
  return (
    <div className="container text-center py-6 md:py-12 px-4">
      <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 md:px-4 md:py-3 rounded mb-4 max-w-md mx-auto text-sm">
        <h2 className="text-lg md:text-xl font-bold mb-2">Hata!</h2>
        <p className="mb-4">{error}</p>
      </div>
      <Button onClick={() => navigate('/admin/kullanicilar/adminler')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Admin Listesine Dön
      </Button>
    </div>
  );
}

if (!admin) {
  return (
    <div className="container text-center py-6 md:py-12 px-4">
      <h2 className="text-lg md:text-xl font-bold mb-4">Admin bulunamadı</h2>
      <Button onClick={() => navigate('/admin/kullanicilar/adminler')}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Admin Listesine Dön
      </Button>
    </div>
  );
}

return (
  <div className="container px-4 md:px-6">
    <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4 md:mb-6">
      <Button 
        variant="ghost" 
        className="self-start"
        onClick={() => navigate('/admin/kullanicilar/adminler')}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri
      </Button>
      <h1 className="text-xl md:text-2xl font-bold">Admin Detayı</h1>
      <div className="flex md:ml-auto space-x-2 mt-2 md:mt-0">
        <Button 
          variant="outline" 
          size={isMobile ? "sm" : "default"} 
          onClick={handleEdit}
        >
          <Edit className="h-4 w-4 mr-1 md:mr-2" />
          <span className="md:inline">Düzenle</span>
        </Button>
        <Button 
          variant="destructive"
          size={isMobile ? "sm" : "default"}
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4 mr-1 md:mr-2" />
          <span className="md:inline">Sil</span>
        </Button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Admin Profil Kartı */}
      <Card className="md:col-span-1">
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xl md:text-2xl mb-2 md:mb-4 ring-4 ring-red-50 dark:ring-red-900/20">
              {getInitials(admin.name)}
            </div>
            <h2 className="text-lg md:text-xl font-bold text-center">{admin.name}</h2>
            <p className="text-muted-foreground text-sm md:text-base text-center">{admin.institution}</p>
            
            <div className="mt-4 md:mt-6 w-full">
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-center text-sm md:text-base">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm break-all">{admin.email}</span>
                </div>
                <div className="flex items-center text-sm md:text-base">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <span>{admin.phone}</span>
                </div>
                <div className="flex items-center text-sm md:text-base">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <span>{admin.institution}</span>
                </div>
                <div className="flex items-start text-sm md:text-base">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-1 flex-shrink-0" />
                  <span>{admin.address ? `${admin.address}, ${admin.city}` : admin.city}</span>
                </div>
                {admin.branchCount > 0 && (
                  <div className="flex items-center text-sm md:text-base">
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <span>Şube sayısı: {admin.branchCount}</span>
                  </div>
                )}
                <div className="flex items-center text-sm md:text-base">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <span>Katılım: {formatDate(admin.joinDate)}</span>
                </div>
                <div className="flex items-center text-sm md:text-base">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                  <span>Son giriş: {formatDate(admin.lastLogin)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 md:mt-6 w-full">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm md:text-base">Durum</span>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                  admin.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-400' 
                    : 'bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-400'
                }`}>
                  {admin.status === 'active' ? 
                    <><CheckCircle className="h-3 w-3 mr-1" /> Aktif</> : 
                    <><XCircle className="h-3 w-3 mr-1" /> Pasif</>
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detay Kartı */}
      <Card className="md:col-span-2">
        <CardContent className="pt-4 md:pt-6">
          {/* Tabs bileşeni yerine alternatif çözüm */}
          <div className="border-b border-border">
            <div className="flex space-x-2">
              <button
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-medium ${
                  activeTab === "activities"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("activities")}
              >
                Aktiviteler
              </button>
            </div>
          </div>
          
          {/* İçerik */}
          <div className="mt-4">
            <h3 className="text-base md:text-lg font-medium mb-3 md:mb-4">Son Aktiviteler</h3>
            <div className="space-y-3 md:space-y-4">
              {admin.activities.length > 0 ? (
                admin.activities.map((activity, index) => (
                  <div key={index} className={`p-3 md:p-4 rounded-lg border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <h4 className="font-medium text-sm md:text-base">{activity.action}</h4>
                    <p className="text-xs md:text-sm text-muted-foreground mt-1">
                      {formatDate(activity.date)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm md:text-base">
                  Henüz aktivite kaydı bulunmuyor.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    
    {/* Düzenleme Modalı */}
    <FormModal
      isOpen={isEditModalOpen}
      onClose={closeEditModal}
      onSave={saveEdit}
      title="Admin Düzenle"
      formData={editForm}
      onChange={handleFormChange}
      color="red"
    />
  </div>
);
};

export default AdminDetay;
