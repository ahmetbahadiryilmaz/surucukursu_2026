import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Mail, Phone, Building2, Calendar, 
  Clock, MapPin, Edit, Trash2
} from "lucide-react";
import { apiService } from '../../services/api-service'; // API servisimizi import ediyoruz

// Manager detay tipi
export type ManagerDetail = {
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
  activities: Array<{
    date: string;
    action: string;
  }>;
};

const DSManagerDetay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [manager, setManager] = useState<ManagerDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'activities'>('activities');
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    const fetchManager = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      try {
        // API'den sürücü okulu yöneticisi detaylarını çek
        const managerData = await apiService.admin.getDrivingSchoolManagerById(id);
        
        // API'den gelen verileri ManagerDetail tipine dönüştür
        if (managerData) {
          const formattedManager: ManagerDetail = {
            id: managerData.id,
            name: managerData.name || "İsimsiz",
            email: managerData.email || "",
            phone: managerData.phone || "",
            institution: managerData.company || "Belirtilmemiş",
            status: managerData.isActive ? 'active' : 'inactive',
            address: managerData.address || "",
            city: managerData.city || "Belirtilmemiş",
            joinDate: managerData.createdAt || new Date().toISOString(),
            lastLogin: managerData.lastLogin || new Date().toISOString(),
            // Aktiviteler için şimdilik standart veriler kullanıyoruz
            // API'de aktivite verisi varsa burası güncellenecek
            activities: managerData.activities || [
              { date: new Date().toISOString(), action: "Sisteme giriş yapıldı" },
              { date: new Date(Date.now() - 86400000).toISOString(), action: "Profil güncellendi" }
            ]
          };
          
          setManager(formattedManager);
        } else {
          setError("Yönetici detayları bulunamadı");
        }
      } catch (error: any) {
        console.error("Yönetici detayları alınırken hata oluştu:", error);
        
        // Hata mesajını belirle
        let errorMsg = "Yönetici detayları yüklenirken bir hata oluştu.";
        if (error.response && error.response.data && error.response.data.message) {
          errorMsg = error.response.data.message;
        } else if (typeof error.message === 'string') {
          errorMsg = error.message;
        }
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchManager();
  }, [id]);

  // Bir yöneticiyi silme işlemi
  const handleDelete = async () => {
    if (!id || !manager) return;
    
    if (window.confirm(`"${manager.name}" adlı yöneticiyi silmek istediğinize emin misiniz?`)) {
      try {
        setLoading(true);
        setError(null);
        
        await apiService.admin.deleteDrivingSchoolManager(id);
        
        navigate('/admin/kullanicilar/ds-manager', { 
          state: { message: "Yönetici başarıyla silindi" } 
        });
      } catch (error: any) {
        console.error("Yönetici silinirken hata oluştu:", error);
        
        // Hata mesajını belirle
        let errorMsg = "Yönetici silinirken bir hata oluştu.";
        if (error.response && error.response.data && error.response.data.message) {
          errorMsg = error.response.data.message;
        } else if (typeof error.message === 'string') {
          errorMsg = error.message;
        }
        setError(errorMsg);
        setLoading(false);
      }
    }
  };

  // Düzenleme sayfasına gitme
  const handleEdit = () => {
    navigate(`/admin/kullanicilar/ds-manager/duzenle/${id}`);
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
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }).format(date);
  };

  if (loading) {
    return (
      <div className="container flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
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
        <Button onClick={() => navigate('/admin/kullanicilar/ds-manager')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Yönetici Listesine Dön
        </Button>
      </div>
    );
  }

  if (!manager) {
    return (
      <div className="container text-center py-6 md:py-12 px-4">
        <h2 className="text-lg md:text-xl font-bold mb-4">Yönetici bulunamadı</h2>
        <Button onClick={() => navigate('/admin/kullanicilar/ds-manager')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Yönetici Listesine Dön
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
          onClick={() => navigate('/admin/kullanicilar/ds-manager')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <h1 className="text-xl md:text-2xl font-bold">Yönetici Detayı</h1>
        <div className="flex md:ml-auto space-x-2 mt-2 md:mt-0">
          <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={handleEdit}>
            <Edit className="h-4 w-4 mr-1 md:mr-2" />
            <span className="md:inline">Düzenle</span>
          </Button>
          <Button 
            variant="outline" 
            size={isMobile ? "sm" : "default"}
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-1 md:mr-2" />
            <span className="md:inline">Sil</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Yönetici Profil Kartı */}
        <Card className="md:col-span-1">
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col items-center">
              {/* Avatar bileşeni yerine alternatif çözüm */}
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl md:text-2xl mb-2 md:mb-4">
                {getInitials(manager.name)}
              </div>
              <h2 className="text-lg md:text-xl font-bold text-center">{manager.name}</h2>
              <p className="text-muted-foreground text-sm md:text-base text-center">{manager.institution}</p>
              
              <div className="mt-4 md:mt-6 w-full">
                <div className="space-y-3 md:space-y-4">
                  <div className="flex items-center text-sm md:text-base">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm break-all">{manager.email}</span>
                  </div>
                  <div className="flex items-center text-sm md:text-base">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <span>{manager.phone}</span>
                  </div>
                  <div className="flex items-center text-sm md:text-base">
                    <Building2 className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <span>{manager.institution}</span>
                  </div>
                  <div className="flex items-start text-sm md:text-base">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground mt-1 flex-shrink-0" />
                    <span>{manager.address}, {manager.city}</span>
                  </div>
                  <div className="flex items-center text-sm md:text-base">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <span>Katılım: {formatDate(manager.joinDate)}</span>
                  </div>
                  <div className="flex items-center text-sm md:text-base">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
                    <span>Son giriş: {manager.lastLogin}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 md:mt-6 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm md:text-base">Durum</span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    manager.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {manager.status === 'active' ? 'Aktif' : 'Pasif'}
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
              <>
                <h3 className="text-base md:text-lg font-medium mb-3 md:mb-4">Son Aktiviteler</h3>
                <div className="space-y-3 md:space-y-4">
                  {manager.activities.length > 0 ? (
                    manager.activities.map((activity, index) => (
                      <div key={index} className="flex items-start border-b pb-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm md:text-base">{activity.action}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">{formatDate(activity.date)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm md:text-base">
                      Henüz aktivite kaydı bulunmuyor.
                    </div>
                  )}
                </div>
              </>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DSManagerDetay;
