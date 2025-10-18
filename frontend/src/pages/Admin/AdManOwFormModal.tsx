import React from 'react';
import { useTheme } from "@/components/providers/ThemeProvider";

// FormModal için prop tipi
interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  color: 'blue' | 'red' | 'green'; // Modal rengi (mavi, kırmızı veya yeşil)
  isNewAdmin?: boolean; // Yeni admin ekleme modu için eklenen özellik
}

const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  formData,
  onChange,
  color,
  isNewAdmin = false // Varsayılan değer olarak false atadık
}) => {
  const { theme } = useTheme();
  // Mevcut tema 'dark' mu kontrol et
  const isDarkMode = theme === 'dark';
  
  if (!isOpen) return null;

  // Renk sınıflarını belirle
  let buttonColor, focusRingColor;
  
  switch (color) {
    case 'blue':
      buttonColor = 'bg-blue-600 hover:bg-blue-700';
      focusRingColor = 'focus:ring-blue-500 focus:border-blue-500';
      break;
    case 'red':
      buttonColor = 'bg-red-600 hover:bg-red-700';
      focusRingColor = 'focus:ring-red-500 focus:border-red-500';
      break;
    case 'green':
      buttonColor = 'bg-green-600 hover:bg-green-700';
      focusRingColor = 'focus:ring-green-500 focus:border-green-500';
      break;
    default:
      buttonColor = 'bg-blue-600 hover:bg-blue-700';
      focusRingColor = 'focus:ring-blue-500 focus:border-blue-500';
  }

  // Ortak input stili - Dark mode'a uygun olarak güncellendi
  const inputStyle = {
    width: '100%',
    padding: '8px',
    border: '1px solid',
    borderColor: isDarkMode ? '#4b5563' : '#ccc',
    borderRadius: '4px',
    backgroundColor: isDarkMode ? '#374151' : 'white',
    color: isDarkMode ? 'white' : 'black',
    fontSize: '16px'
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}
    >
      <div
        className={`p-6 rounded-lg shadow-lg max-w-md w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
        style={{ padding: '24px', borderRadius: '8px', maxWidth: '500px', width: '100%' }}
      >
        {/* Modal Başlığı */}
        <div className={`border-b pb-3 mb-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{title}</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="ad" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              Ad Soyad
            </label>
            <input
              id="ad"
              name="ad"
              value={formData.ad}
              onChange={onChange}
              placeholder="Ad Soyad giriniz"
              autoComplete="off"
              className={`w-full p-2 border rounded-md ${focusRingColor} ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              style={inputStyle}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={onChange}
              placeholder="E-posta adresini giriniz"
              autoComplete="off"
              className={`w-full p-2 border rounded-md ${focusRingColor} ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              style={inputStyle}
              required
              disabled={!isNewAdmin && title.includes('Düzenle')} // Yeni admin değilse ve düzenleme modundaysa email'i düzenlenemez yap
            />
          </div>

          {/* Şifre alanı - API şemasına uygun olarak eklendi */}
          <div className="space-y-1">
            <label htmlFor="password" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              Şifre {isNewAdmin ? '(Zorunlu)' : '(değiştirmek istemiyorsanız boş bırakın)'}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password || ""}
              onChange={onChange}
              placeholder={isNewAdmin ? 'Şifre giriniz' : 'Şifre değiştirmek için doldurun'}
              autoComplete="new-password"
              className={`w-full p-2 border rounded-md ${focusRingColor} ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              style={inputStyle}
              required={isNewAdmin} // Yeni admin ekleme modunda zorunlu
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="telefon" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              Telefon
            </label>
            <input
              id="telefon"
              name="telefon"
              value={formData.telefon}
              onChange={onChange}
              placeholder="Telefon numarası giriniz"
              autoComplete="off"
              className={`w-full p-2 border rounded-md ${focusRingColor} ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              style={inputStyle}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="kurum" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              Kurum Adı
            </label>
            <input
              id="kurum"
              name="kurum"
              value={formData.kurum}
              onChange={onChange}
              placeholder="Kurum adını giriniz"
              autoComplete="off"
              className={`w-full p-2 border rounded-md ${focusRingColor} ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              style={inputStyle}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="sehir" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              Şehir
            </label>
            <input
              id="sehir"
              name="sehir"
              value={formData.sehir}
              onChange={onChange}
              placeholder="Şehir giriniz"
              autoComplete="off"
              className={`w-full p-2 border rounded-md ${focusRingColor} ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              style={inputStyle}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="subeSayisi" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              Şube Sayısı
            </label>
            <input
              id="subeSayisi"
              name="subeSayisi"
              type="number"
              min="0"
              value={formData.subeSayisi}
              onChange={onChange}
              placeholder="Şube sayısını giriniz"
              autoComplete="off"
              className={`w-full p-2 border rounded-md ${focusRingColor} ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              style={inputStyle}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="durum" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
              Durum
            </label>
            <select
              id="durum"
              name="durum"
              value={formData.durum}
              onChange={onChange}
              className={`w-full p-2 border rounded-md ${focusRingColor} ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              style={inputStyle}
            >
              <option value="Aktif">Aktif</option>
              <option value="Pasif">Pasif</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end space-x-4 mt-6">
          <button
            className={`px-4 py-2 rounded-md transition-colors ${isDarkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            style={{ padding: '8px 16px', borderRadius: '4px' }}
            onClick={onClose}
          >
            İptal
          </button>
          <button
            className={`px-4 py-2 ${buttonColor} text-white rounded-md transition-colors`}
            style={{ padding: '8px 16px', backgroundColor: color === 'blue' ? '#2563eb' : color === 'red' ? '#dc2626' : '#16a34a', color: 'white', borderRadius: '4px' }}
            onClick={onSave}
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormModal;
