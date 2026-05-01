import React, { useEffect, useMemo, useState } from 'react';
import { useTheme } from "@/components/providers/ThemeProvider";
import { X } from 'lucide-react';
import SearchableSelect from '@/components/ui/searchable-select';

// Owner tipini API şemasına uygun olarak tanımlayalım
interface Owner {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
}

// Manager tipini API şemasına uygun olarak tanımlayalım
interface Manager {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
}

// City tipini API şemasına uygun olarak tanımlayalım
interface City {
  id: string;
  name: string;
}

// District tipini API şemasına uygun olarak tanımlayalım
interface District {
  id: string;
  name: string;
  city_id: number;
}

// KursFormModal için prop tipi - MEBBIS alanları kaldırıldı
interface KursFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  isEdit?: boolean; // Add flag to distinguish between create and edit modes
  formData: {
    name: string;
    address: string;
    phone: string;
    owner_id: string;
    manager_id: string;
    city_id: string;
    district_id: string;
    subscription_type: string;
    subscription_duration: string;
    subscription_ends_at?: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { name: string; value: string | number }) => void;
  owners: Owner[];
  managers: Manager[];
  cities: City[];
  districts: District[];
  error?: string | null;
}

const KursFormModal: React.FC<KursFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  isEdit = false,
  formData,
  onChange,
  owners,
  managers,
  cities,
  districts,
  error
}) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'general' | 'location' | 'subscription'>('general');

  // Tab validation helpers
  const isTabValid = (tab: 'general' | 'location' | 'subscription'): boolean => {
    switch (tab) {
      case 'general':
        return !!(formData.name && formData.address && formData.phone);
      case 'location':
        return !!(formData.city_id && formData.district_id && formData.owner_id && formData.manager_id);
      case 'subscription':
        return !!(formData.subscription_type && (
          !isEdit ? formData.subscription_duration : formData.subscription_ends_at
        ));
      default:
        return false;
    }
  };


  
  // Filter districts based on selected city
  const filteredDistricts = useMemo(() => {
    if (!formData.city_id) return [];
    return districts.filter(district => district.city_id.toString() === formData.city_id.toString());
  }, [districts, formData.city_id]);
  
  // Handle city change - clear district when city changes
  const handleCityChange = (value: string | number) => {
    onChange({ name: 'city_id', value });
    // Clear district selection when city changes
    if (formData.district_id) {
      onChange({ name: 'district_id', value: '' });
    }
  };
  


  // Reset district when form opens if the selected district doesn't belong to the selected city
  useEffect(() => {
    if (isOpen && formData.city_id && formData.district_id) {
      const isDistrictValid = filteredDistricts.some(
        district => district.id.toString() === formData.district_id.toString()
      );
      if (!isDistrictValid) {
        onChange({ name: 'district_id', value: '' });
      }
    }
  }, [isOpen, formData.city_id, formData.district_id, filteredDistricts, onChange]);

  // Reset to first tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (event.ctrlKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            setActiveTab('general');
            break;
          case '2':
            event.preventDefault();
            setActiveTab('location');
            break;
          case '3':
            event.preventDefault();
            setActiveTab('subscription');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);
  
  if (!isOpen) return null;

  const modalClass = `fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] 
                      ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                      transition-opacity duration-300`;

  const contentClass = `p-4 md:p-6 rounded-lg shadow-lg w-full max-w-4xl mx-auto 
                        ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}
                        ${isOpen ? 'scale-100' : 'scale-95'} 
                        transition-transform duration-300
                        max-h-[90vh] overflow-y-auto`;

  const inputStyle = `w-full p-2 border rounded-md focus:outline-none focus:ring-2 text-base
                      ${isDarkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:ring-blue-400' 
                      : 'bg-white text-black border-gray-300 focus:ring-blue-500'}`;

  const buttonBase = `px-4 py-2 rounded-md text-base font-medium transition-colors 
                      focus:outline-none focus:ring-2 focus:ring-offset-2`;

  const cancelButton = `${buttonBase} ${isDarkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500' 
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-300'}`;

  const saveButton = `${buttonBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;





  return (
    <div className={modalClass}>
      <div className={contentClass}>
        {/* Modal Başlığı ve Kapat Butonu */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
            <strong className="font-bold">Hata! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}



        {/* Tab Navigation */}
        <div className="flex border-b mb-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            title="Genel bilgiler - Kurs adı, telefon ve adres (Ctrl+1)"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>1. Genel Bilgiler</span>
            {isTabValid('general') && <span className="text-green-500">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('location')}
            title="Konum ve kişiler - İl, ilçe, sahip ve yönetici seçimi (Ctrl+2)"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'location'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>2. Konum & Kişiler</span>
            {isTabValid('location') && <span className="text-green-500">✓</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('subscription')}
            title="Abonelik ayarları - Tür ve süre belirleme (Ctrl+3)"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 whitespace-nowrap ${
              activeTab === 'subscription'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>3. Abonelik</span>
            {isTabValid('subscription') && <span className="text-green-500">✓</span>}
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Tamamlanan: {[isTabValid('general'), isTabValid('location'), isTabValid('subscription')].filter(Boolean).length}/3</span>
            <span className="hidden md:block">Kısayol: Ctrl + 1,2,3</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div 
              className="bg-blue-500 h-1 rounded-full transition-all duration-300" 
              style={{ 
                width: `${([isTabValid('general'), isTabValid('location'), isTabValid('subscription')].filter(Boolean).length / 3) * 100}%` 
              }}
            />
          </div>
        </div>

        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
          {/* General Information Tab */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label htmlFor="name" className="block text-sm font-medium">
                  Kurs Adı*
                </label>
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={onChange}
                  required
                  placeholder="Kurs adını giriniz"
                  autoComplete="off"
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="phone" className="block text-sm font-medium">
                  Telefon*
                </label>
                <input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={onChange}
                  required
                  placeholder="Telefon numarası giriniz"
                  autoComplete="off"
                  className={inputStyle}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium">
                  Adres*
                </label>
                <input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={onChange}
                  required
                  placeholder="Adres giriniz"
                  autoComplete="off"
                  className={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Location & People Tab */}
          {activeTab === 'location' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label htmlFor="city_id" className="block text-sm font-medium">
                  İl*
                </label>
                <SearchableSelect
                  options={cities.map(city => ({ value: city.id.toString(), label: city.name }))}
                  value={formData.city_id}
                  onChange={handleCityChange}
                  placeholder="İl seçiniz"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="district_id" className="block text-sm font-medium">
                  İlçe*
                </label>
                <SearchableSelect
                  options={filteredDistricts.map(district => ({ value: district.id.toString(), label: district.name }))}
                  value={formData.district_id}
                  onChange={(value) => onChange({ name: 'district_id', value })}
                  placeholder={formData.city_id ? "İlçe seçiniz" : "Önce il seçiniz"}
                  disabled={!formData.city_id}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="owner_id" className="block text-sm font-medium">
                  Kurs Sahibi*
                </label>
                <SearchableSelect
                  value={formData.owner_id}
                  onChange={(value) => onChange({ name: 'owner_id', value })}
                  placeholder="Kurs sahibi seçiniz"
                  options={owners.map(owner => ({
                    value: owner.id,
                    label: `${owner.name} (${owner.email})`
                  }))}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="manager_id" className="block text-sm font-medium">
                  Kurs Yöneticisi*
                </label>
                <SearchableSelect
                  value={formData.manager_id}
                  onChange={(value) => onChange({ name: 'manager_id', value })}
                  placeholder="Kurs yöneticisi seçiniz"
                  options={managers.map(manager => ({
                    value: manager.id,
                    label: `${manager.name} (${manager.email})`
                  }))}
                />
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label htmlFor="subscription_type" className="block text-sm font-medium">
                  Abonelik Türü*
                </label>
                <select
                  id="subscription_type"
                  name="subscription_type"
                  value={formData.subscription_type}
                  onChange={onChange}
                  required
                  className={inputStyle}
                >
                  <option value="">Abonelik türü seçiniz</option>
                  <option value="demo">Demo (Sınırlı)</option>
                  <option value="unlimited">Limitsiz</option>
                </select>
              </div>

              <div className="space-y-1">
                {isEdit ? (
                  // For editing: Show end date picker
                  <>
                    <label htmlFor="subscription_ends_at" className="block text-sm font-medium">
                      Abonelik Bitiş Tarihi*
                    </label>
                    <input
                      id="subscription_ends_at"
                      name="subscription_ends_at"
                      type="date"
                      value={formData.subscription_ends_at || ''}
                      onChange={onChange}
                      required
                      className={inputStyle}
                    />
                  </>
                ) : (
                  // For creating: Show duration options
                  <>
                    <label htmlFor="subscription_duration" className="block text-sm font-medium">
                      Abonelik Süresi*
                    </label>
                    <select
                      id="subscription_duration"
                      name="subscription_duration"
                      value={formData.subscription_duration}
                      onChange={onChange}
                      required
                      className={inputStyle}
                    >
                      <option value="">Süre seçiniz</option>
                      <option value="monthly">Aylık</option>
                      <option value="yearly">Yıllık</option>
                    </select>
                  </>
                )}
              </div>

              {/* Subscription Info */}
              <div className="md:col-span-2 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Abonelik Bilgileri:</h4>
                <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• <strong>Demo:</strong> 10 adet PDF yazdırma hakkı</li>
                  <li>• <strong>Limitsiz:</strong> Sınırsız PDF yazdırma</li>
                  <li>• <strong>Aylık:</strong> 30 gün süreyle geçerli</li>
                  <li>• <strong>Yıllık:</strong> 365 gün süreyle geçerli</li>
                </ul>
              </div>
            </div>
          )}
        
          <div className="flex justify-between items-center pt-6 mt-6 border-t">
            {/* Navigation Buttons */}
            <div className="flex space-x-2">
              {activeTab !== 'general' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'subscription') setActiveTab('location');
                    else if (activeTab === 'location') setActiveTab('general');
                  }}
                  className={`px-4 py-2 text-sm ${isDarkMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-500' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } rounded transition-colors`}
                >
                  ← Önceki
                </button>
              )}
              
              {activeTab !== 'subscription' && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab === 'general') setActiveTab('location');
                    else if (activeTab === 'location') setActiveTab('subscription');
                  }}
                  className={`px-4 py-2 text-sm ${isDarkMode 
                    ? 'bg-gray-600 text-white hover:bg-gray-500' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } rounded transition-colors`}
                >
                  Sonraki →
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                className={cancelButton}
                onClick={onClose}
              >
                İptal
              </button>
              <button
                type="submit"
                className={saveButton}
              >
                Kaydet
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KursFormModal;
