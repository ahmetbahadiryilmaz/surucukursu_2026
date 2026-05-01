import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Mail, Phone, Shield, Calendar, 
  Clock, MapPin, Edit 
} from "lucide-react";

// Kullanıcı detay tipi
export type UserDetail = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'instructor' | 'staff';
  status: 'active' | 'inactive';
  address: string;
  position: string;
  department: string;
  joinDate: string;
  lastLogin: string;
  permissions: string[];
  activities: Array<{
    date: string;
    action: string;
  }>;
};

// Örnek veri - gerçek uygulamada API'den çekilecek
const fakeUserDetails: Record<number, UserDetail> = {
  1: {
    id: 1,
    name: "Ahmet Yılmaz",
    email: "ahmet@mtsk.com",
    phone: "+90 (555) 123-4567",
    role: "admin",
    status: "active",
    address: "Ankara, Türkiye",
    position: "Sistem Yöneticisi",
    department: "Bilgi Teknolojileri",
    joinDate: "2023-06-15",
    lastLogin: "2025-04-28 09:45:23",
    permissions: [
      "Kullanıcı Yönetimi",
      "Kurs Yönetimi",
      "Rapor Görüntüleme",
      "Sistem Ayarları",
      "Öğrenci Kaydı"
    ],
    activities: [
      { date: "2025-04-28 09:45:23", action: "Sisteme giriş yapıldı" },
      { date: "2025-04-27 16:30:22", action: "Kullanıcı kaydı güncellendi" },
      { date: "2025-04-26 14:15:10", action: "Yeni kurs eklendi" },
      { date: "2025-04-25 11:45:38", action: "Rapor indirildi" },
      { date: "2025-04-24 09:20:15", action: "Sistem ayarları değiştirildi" }
    ]
  },
  // Diğer kullanıcı detayları...
};

// Diğer kullanıcılar için varsayılan detaylar
const getDefaultUserDetail = (
  id: number, 
  name: string, 
  email: string, 
  role: UserDetail['role'] = 'staff', 
  status: UserDetail['status'] = 'active'
): UserDetail => ({
  id,
  name,
  email,
  phone: "+90 (555) 000-0000",
  role,
  status,
  address: "Türkiye",
  position: "Belirtilmemiş",
  department: "Belirtilmemiş",
  joinDate: "2023-01-01",
  lastLogin: "2025-04-25 12:00:00",
  permissions: ["Temel İzinler"],
  activities: [
    { date: "2025-04-25 12:00:00", action: "Sisteme giriş yapıldı" }
  ]
});

const KullaniciDetay: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'permissions' | 'activities'>('permissions');

  useEffect(() => {
    const fetchUser = () => {
      setLoading(true);
      setTimeout(() => {
        if (id) {
          const userId = parseInt(id);
          const foundUser = fakeUserDetails[userId];
          
          setUser(
            foundUser || 
            getDefaultUserDetail(
              userId, 
              `Kullanıcı ${userId}`, 
              `user${userId}@mtsk.com`
            )
          );
        }
        setLoading(false);
      }, 500);
    };

    fetchUser();
  }, [id]);

  // Rol metni formatlaması
  const formatRole = (role: UserDetail['role']): string => {
    const roleMap: Record<UserDetail['role'], string> = {
      'admin': 'Admin',
      'manager': 'Yönetici',
      'instructor': 'Eğitmen',
      'staff': 'Personel'
    };
    return roleMap[role];
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
    return <div className="container flex items-center justify-center h-64">Yükleniyor...</div>;
  }

  if (!user) {
    return (
      <div className="container text-center py-12">
        <h2 className="text-xl font-bold mb-4">Kullanıcı bulunamadı</h2>
        <Button onClick={() => navigate('/admin/kullanicilar')}>Kullanıcılar Sayfasına Dön</Button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="mr-4"
          onClick={() => navigate('/admin/kullanicilar')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri
        </Button>
        <h1 className="text-2xl font-bold">Kullanıcı Detayı</h1>
        <div className="ml-auto">
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Düzenle
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kullanıcı Profil Kartı */}
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              {/* Avatar bileşeni yerine alternatif çözüm */}
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl mb-4">
                {getInitials(user.name)}
              </div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground">{user.position}</p>
              
              <div className="mt-6 w-full">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{user.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{formatRole(user.role)}</span>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{user.address}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Katılım: {formatDate(user.joinDate)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Son giriş: {user.lastLogin}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 w-full">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Durum</span>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status === 'active' ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detay Kartı */}
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            {/* Tabs bileşeni yerine alternatif çözüm */}
            <div className="border-b border-border">
              <div className="flex space-x-2">
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === "permissions"
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setActiveTab("permissions")}
                >
                  Yetkiler
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
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
              {activeTab === "permissions" && (
                <>
                  <h3 className="text-lg font-medium mb-4">Kullanıcı Yetkileri</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {user.permissions.map((permission, index) => (
                      <div key={index} className="flex items-center p-2 border rounded">
                        <Shield className="h-4 w-4 mr-2 text-primary" />
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              
              {activeTab === "activities" && (
                <>
                  <h3 className="text-lg font-medium mb-4">Son Aktiviteler</h3>
                  <div className="space-y-4">
                    {user.activities.map((activity, index) => (
                      <div key={index} className="flex items-start border-b pb-3">
                        <div className="flex-1">
                          <p className="font-medium">{activity.action}</p>
                          <p className="text-sm text-muted-foreground">{activity.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KullaniciDetay;
