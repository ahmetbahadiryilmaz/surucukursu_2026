import React, { useEffect } from 'react';
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
}

// KursFormModal için prop tipi - MEBBIS alanları kaldırıldı
interface KursFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  formData: {
    name: string;
    address: string;
    phone: string;
    owner_id: string;
    manager_id: string;
    city_id: string;
    district_id: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { name: string; value: string | number }) => void;
  owners: Owner[];
  managers: Manager[];
  cities: City[];
  districts: District[];
  error?: string | null;
}

// City ve District tipleri
interface City {
  id: string;
  name: string;
}

interface District {
  id: string;
  name: string;
  city_id: number;
}

const KursFormModal: React.FC<KursFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
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
  
  // Debug için log ekleyelim
  useEffect(() => {
    if (isOpen) {
      console.log("Form Verileri:", formData);
      console.log("Sahipler:", owners);
      console.log("Yöneticiler:", managers);
      console.log("Şehirler:", cities);
      console.log("İlçeler:", districts);
      console.log("Seçili sahip ID:", formData.owner_id);
      console.log("Seçili yönetici ID:", formData.manager_id);
      console.log("Seçili şehir ID:", formData.city_id);
      console.log("Seçili ilçe ID:", formData.district_id);
    }
  }, [isOpen, formData, owners, managers, cities, districts]);
  
  if (!isOpen) return null;

  const modalClass = `fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] 
                      ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                      transition-opacity duration-300`;

  const contentClass = `p-4 md:p-6 rounded-lg shadow-lg w-full max-w-md mx-auto 
                        ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}
                        ${isOpen ? 'scale-100' : 'scale-95'} 
                        transition-transform duration-300
                        max-h-[90vh] overflow-y-auto`;

  const inputStyle = `w-full p-2 rounded-md focus:outline-none focus:ring-2 text-base
                      ${isDarkMode 
                      ? 'bg-gray-700 text-white border-gray-600 focus:ring-blue-400' 
                      : 'bg-white text-black border-gray-300 focus:ring-blue-500'}`;

  const buttonBase = `px-4 py-2 rounded-md text-base font-medium transition-colors 
                      focus:outline-none focus:ring-2 focus:ring-offset-2`;

  const cancelButton = `${buttonBase} ${isDarkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500' 
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-300'}`;

  const saveButton = `${buttonBase} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;

  // Select değerlerini kontrol etmek için
  const validateSelect = (id: string, array: any[], idField: string = 'id'): boolean => {
    if (!id) return false;
    return array.some(item => item[idField]?.toString() === id.toString());
  };

  // Sahip seçimi geçerli mi kontrolü
  const isOwnerValid = validateSelect(formData.owner_id, owners);
  
  // Yönetici seçimi geçerli mi kontrolü
  const isManagerValid = validateSelect(formData.manager_id, managers);

  // Şehir seçimi geçerli mi kontrolü
  const isCityValid = validateSelect(formData.city_id, cities);

  // İlçe seçimi geçerli mi kontrolü
  const isDistrictValid = validateSelect(formData.district_id, districts);

  console.log("Sahip seçimi geçerli mi?", isOwnerValid);
  console.log("Yönetici seçimi geçerli mi?", isManagerValid);
  console.log("Şehir seçimi geçerli mi?", isCityValid);
  console.log("İlçe seçimi geçerli mi?", isDistrictValid);

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

        {/* Form Debug Bilgileri - Geliştirme zamanında yararlı */}
        <div className="hidden">
          <pre>
            {JSON.stringify({
              formData,
              ownersCount: owners.length,
              managersCount: managers.length,
              citiesCount: cities.length,
              districtsCount: districts.length,
              isOwnerValid,
              isManagerValid,
              isCityValid,
              isDistrictValid
            }, null, 2)}
          </pre>
        </div>

        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
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
              className={inputStyle}
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
              className={inputStyle}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="cityId" className="block text-sm font-medium">
              İl*
            </label>
            <SearchableSelect
              options={cities.map(city => ({ value: city.id, label: city.name }))}
              value={formData.city_id}
              onChange={(value) => onChange({ name: 'city_id', value })}
              placeholder="İl seçiniz"
              className={inputStyle}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="district_id" className="block text-sm font-medium">
              İlçe*
            </label>
            <SearchableSelect
              options={districts.map(district => ({ value: district.id, label: district.name }))}
              value={formData.district_id}
              onChange={(value) => onChange({ name: 'district_id', value })}
              placeholder="İlçe seçiniz"
              className={inputStyle}
            />
          </div>
        
          <div className="flex justify-end space-x-3 pt-4 mt-6 border-t">
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
        </form>
      </div>
    </div>
  );
};

export default KursFormModal;
