// Constants for Kurslar page

/**
 * Default form data for new kurs creation
 */
export const DEFAULT_KURS_FORM = {
  name: '',
  address: '',
  phone: '',
  owner_id: '',
  manager_id: '',
  city_id: '',
  district_id: '',
  subscription_type: 'demo',
  subscription_duration: 'monthly'
} as const;

/**
 * Validation messages for form fields
 */
export const VALIDATION_MESSAGES = {
  REQUIRED_NAME: 'Kurs adı zorunludur',
  REQUIRED_ADDRESS: 'Adres zorunludur',
  REQUIRED_PHONE: 'Telefon numarası zorunludur',
  REQUIRED_OWNER: 'Kurs sahibi seçimi zorunludur',
  REQUIRED_MANAGER: 'Kurs yöneticisi seçimi zorunludur',
  INVALID_PHONE: 'Geçerli bir telefon numarası girin',
  DUPLICATE_NAME: 'Bu isimde bir kurs zaten mevcut',
  FIELD_REQUIRED: 'Bu alan zorunludur'
} as const;

/**
 * Success messages for operations
 */
export const SUCCESS_MESSAGES = {
  KURS_CREATED: 'Kurs başarıyla oluşturuldu',
  KURS_UPDATED: 'Kurs başarıyla güncellendi',
  KURS_DELETED: 'Kurs başarıyla silindi',
  DATA_REFRESHED: 'Veriler başarıyla yenilendi'
} as const;

/**
 * Error messages for operations
 */
export const ERROR_MESSAGES = {
  FETCH_ERROR: 'Kurslar yüklenirken bir hata oluştu',
  CREATE_ERROR: 'Kurs oluşturulurken bir hata oluştu',
  UPDATE_ERROR: 'Kurs güncellenirken bir hata oluştu',
  DELETE_ERROR: 'Kurs silinirken bir hata oluştu',
  NETWORK_ERROR: 'Bağlantı hatası oluştu',
  UNAUTHORIZED: 'Yetkiniz bulunmuyor',
  NOT_FOUND: 'Kurs bulunamadı',
  SERVER_ERROR: 'Sunucu hatası oluştu'
} as const;

/**
 * Loading messages for different operations
 */
export const LOADING_MESSAGES = {
  FETCHING: 'Kurslar yükleniyor...',
  CREATING: 'Kurs oluşturuluyor...',
  UPDATING: 'Kurs güncelleniyor...',
  DELETING: 'Kurs siliniyor...',
  REFRESHING: 'Veriler yenileniyor...'
} as const;

/**
 * UI Configuration constants
 */
export const UI_CONFIG = {
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  ITEMS_PER_PAGE: 20,
  SEARCH_DEBOUNCE_MS: 300,
  AUTO_REFRESH_INTERVAL: 30000, // 30 seconds
  TOAST_DURATION: 3000 // 3 seconds
} as const;

/**
 * Table column configuration
 */
export const TABLE_COLUMNS = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'name', label: 'Kurs Adı', width: 'auto' },
  { key: 'address', label: 'Adres', width: 'auto' },
  { key: 'phone', label: 'Telefon', width: '150px' },
  { key: 'owner', label: 'Kurs Sahibi', width: '150px' },
  { key: 'manager', label: 'Kurs Yöneticisi', width: '150px' },
  { key: 'actions', label: 'İşlemler', width: '200px' }
] as const;

/**
 * Search placeholder texts
 */
export const SEARCH_PLACEHOLDERS = {
  GENERAL: 'Kurs adı, adres, telefon veya kişi ara...',
  NAME: 'Kurs adı ara...',
  ADDRESS: 'Adres ara...',
  PHONE: 'Telefon ara...',
  OWNER: 'Kurs sahibi ara...',
  MANAGER: 'Kurs yöneticisi ara...'
} as const;

/**
 * Button labels
 */
export const BUTTON_LABELS = {
  ADD: 'Yeni Kurs',
  EDIT: 'Düzenle',
  DELETE: 'Sil',
  SAVE: 'Kaydet',
  CANCEL: 'İptal',
  REFRESH: 'Yenile',
  DETAILS: 'Detay',
  CLOSE: 'Kapat',
  CONFIRM: 'Onayla'
} as const;

/**
 * Modal titles
 */
export const MODAL_TITLES = {
  ADD_KURS: 'Yeni Kurs Ekle',
  EDIT_KURS: 'Kurs Düzenle',
  DELETE_CONFIRM: 'Silme Onayı',
  KURS_DETAILS: 'Kurs Detayları'
} as const;

/**
 * Phone number validation regex
 */
export const PHONE_REGEX = /^(\+90|0)?[0-9]{10}$/;

/**
 * CSS class names for consistent styling
 */
export const CSS_CLASSES = {
  CONTAINER: 'p-6 space-y-6',
  HEADER: 'text-3xl font-bold text-gray-900',
  CARD_CONTAINER: 'space-y-4',
  BUTTON_PRIMARY: 'bg-blue-600 hover:bg-blue-700 text-white',
  BUTTON_DANGER: 'bg-red-600 hover:bg-red-700 text-white',
  BUTTON_SUCCESS: 'bg-green-600 hover:bg-green-700 text-white'
} as const;
