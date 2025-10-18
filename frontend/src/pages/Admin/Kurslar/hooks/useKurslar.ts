import { useState, useCallback } from 'react';
import { apiService, DrivingSchool } from '@/services/api-service';
import Toast from '@/lib/toast';
import { Id } from 'react-toastify';
import type { EditFormData, Owner, Manager, City, District } from '../kurslar.types';

export const useKurslar = () => {
  // State
  const [kurslar, setKurslar] = useState<DrivingSchool[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);

  // Fetch functions
  const fetchKurslar = useCallback(async (showToast = false): Promise<void> => {
    setLoading(true);
    setError(null);
    
    let toastId: Id | null = null;
    if (showToast) {
      toastId = Toast.loading('Kurslar yükleniyor...');
    }
    
    try {
      const data = await apiService.admin.getDrivingSchools();
      
      const enhancedData = data.map((kurs: any) => {
        return {
          ...kurs,
          owner_id: kurs.owner_id || "",
          manager_id: kurs.manager_id || ""
        };
      });
      
      setKurslar(enhancedData);
      
      if (toastId) {
        Toast.update(toastId, `${enhancedData.length} kurs başarıyla yüklendi`, 'success');
      }
    } catch (err: any) {
      console.error("Kurslar getirilirken hata oluştu:", err);
      const errorMsg = 'Kurslar yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
      setError(errorMsg);
      
      if (toastId) {
        Toast.update(toastId, errorMsg, 'error');
      } else {
        Toast.error(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOwnersAndManagers = useCallback(async (): Promise<void> => {
    try {
      const ownersData = await apiService.admin.getDrivingSchoolOwners();
      const managersData = await apiService.admin.getDrivingSchoolManagers();
      
      const formattedOwners = ownersData.map((owner: any) => ({
        id: owner.id ? owner.id.toString() : "",
        name: owner.name || "İsimsiz",
        email: owner.email || "",
        phone: owner.phone || "",
        password: owner.password || ""
      }));
      
      const formattedManagers = managersData.map((manager: any) => ({
        id: manager.id ? manager.id.toString() : "",
        name: manager.name || "İsimsiz",
        email: manager.email || "",
        phone: manager.phone || "",
        password: manager.password || ""
      }));
      
      setOwners(formattedOwners);
      setManagers(formattedManagers);
    } catch (err: any) {
      console.error("Sahip ve yöneticiler getirilirken hata oluştu:", err);
      Toast.warning('Kurs sahipleri ve yöneticileri yüklenirken bir sorun oluştu');
    }
  }, []);

  const fetchCitiesAndDistricts = useCallback(async (): Promise<void> => {
    try {
      // Fetch cities and districts separately for better performance
      const [citiesData, allDistrictsData] = await Promise.all([
        apiService.admin.getCities(),
        apiService.admin.getAllDistricts()
      ]);
      
      setCities(citiesData);
      setDistricts(allDistrictsData);
    } catch (err: any) {
      console.error("Şehirler ve ilçeler getirilirken hata oluştu:", err);
      Toast.warning('Şehirler ve ilçeler yüklenirken bir sorun oluştu');
    }
  }, []);

  // CRUD operations
  const createKurs = useCallback(async (formData: EditFormData): Promise<boolean> => {
    setLoading(true);
    const toastId = Toast.loading('Yeni kurs ekleniyor...');
    
    try {
      // Calculate subscription end date based on duration
      let subscriptionEndDate = null;
      if (formData.subscription_duration === 'monthly') {
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1);
        subscriptionEndDate = endDate.toISOString();
      } else if (formData.subscription_duration === 'yearly') {
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        subscriptionEndDate = endDate.toISOString();
      }

      const requestData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        owner_id: parseInt(formData.owner_id),
        manager_id: parseInt(formData.manager_id),
        city_id: formData.city_id ? parseInt(formData.city_id) : null,
        district_id: formData.district_id ? parseInt(formData.district_id) : null,
        subscription: {
          type: formData.subscription_type,
          ends_at: subscriptionEndDate,
          pdf_print_limit: formData.subscription_type === 'demo' ? 10 : null
        }
      };
      
      await apiService.admin.createDrivingSchool(requestData);
      await fetchKurslar();
      
      Toast.update(toastId, 'Yeni kurs başarıyla eklendi', 'success');
      return true;
    } catch (apiError: any) {
      console.error("Kurs ekleme hatası:", apiError);
      
      let errorMsg = 'Yeni kurs eklenirken bir hata oluştu.';
      if (apiError.response?.status === 401) {
        errorMsg = 'Yetkiniz bulunmuyor. Lütfen tekrar giriş yapın.';
      } else if (apiError.response?.status === 400) {
        errorMsg = 'Geçersiz veri gönderildi. Lütfen tüm alanları kontrol edin.';
      } else if (apiError.response?.data?.message) {
        errorMsg = apiError.response.data.message;
      }
      
      Toast.update(toastId, errorMsg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchKurslar]);

  const updateKurs = useCallback(async (id: string, formData: EditFormData): Promise<boolean> => {
    setLoading(true);
    const toastId = Toast.loading('Kurs güncelleniyor...');
    
    try {
      const updateData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        owner_id: parseInt(formData.owner_id),
        manager_id: parseInt(formData.manager_id),
        city_id: formData.city_id ? parseInt(formData.city_id) : null,
        district_id: formData.district_id ? parseInt(formData.district_id) : null,
        subscription: {
          type: formData.subscription_type,
          ends_at: formData.subscription_ends_at ? new Date(formData.subscription_ends_at).toISOString() : null,
          pdf_print_limit: formData.subscription_type === 'demo' ? 10 : null
        }
      };
      
      await apiService.admin.updateDrivingSchool(id, updateData);
      await fetchKurslar();
      
      Toast.update(toastId, 'Kurs başarıyla güncellendi', 'success');
      return true;
    } catch (apiError: any) {
      console.error("Kurs güncelleme hatası:", apiError);
      
      let errorMsg = 'Kurs güncellenirken bir hata oluştu.';
      if (apiError.response?.status === 401) {
        errorMsg = 'Yetkiniz bulunmuyor. Lütfen tekrar giriş yapın.';
      } else if (apiError.response?.status === 404) {
        errorMsg = 'Kurs bulunamadı.';
      } else if (apiError.response?.data?.message) {
        errorMsg = apiError.response.data.message;
      }
      
      Toast.update(toastId, errorMsg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchKurslar]);

  const deleteKurs = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    const toastId = Toast.loading('Kurs siliniyor...');
    
    try {
      await apiService.admin.deleteDrivingSchool(id);
      await fetchKurslar();
      
      Toast.update(toastId, 'Kurs başarıyla silindi', 'success');
      return true;
    } catch (err: any) {
      console.error("Kurs silinemedi:", err);
      
      let errorMsg = 'Kurs silinirken bir hata oluştu.';
      if (err.response?.status === 404) {
        errorMsg = 'Kurs bulunamadı.';
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      
      Toast.update(toastId, errorMsg, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchKurslar]);

  // Helper functions
  const getOwnerName = useCallback((owner_id: string | number | null | undefined): string => {
    if (!owner_id) return "-";
    const id = owner_id.toString();
    const owner = owners.find(o => o.id === id);
    return owner ? owner.name : "-";
  }, [owners]);

  const getManagerName = useCallback((manager_id: string | number | null | undefined): string => {
    if (!manager_id) return "-";
    const id = manager_id.toString();
    const manager = managers.find(m => m.id === id);
    return manager ? manager.name : "-";
  }, [managers]);

  return {
    // State
    kurslar,
    loading,
    error,
    owners,
    managers,
    cities,
    districts,
    
    // Actions
    fetchKurslar,
    fetchOwnersAndManagers,
    fetchCitiesAndDistricts,
    createKurs,
    updateKurs,
    deleteKurs,
    
    // Helpers
    getOwnerName,
    getManagerName
  };
};
