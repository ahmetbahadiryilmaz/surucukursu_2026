import { EditFormData, FormValidationResult, KursExtended, Owner, Manager } from './kurslar.types';
import { VALIDATION_MESSAGES, PHONE_REGEX, DEFAULT_KURS_FORM } from './kurslar.consts';

/**
 * Validates kurs form data
 */
export const validateKursForm = (formData: EditFormData): FormValidationResult => {
  const errors: Record<string, string> = {};

  // Required field validations
  if (!formData.name.trim()) {
    errors.name = VALIDATION_MESSAGES.REQUIRED_NAME;
  }

  if (!formData.address.trim()) {
    errors.address = VALIDATION_MESSAGES.REQUIRED_ADDRESS;
  }

  if (!formData.phone.trim()) {
    errors.phone = VALIDATION_MESSAGES.REQUIRED_PHONE;
  } else if (!PHONE_REGEX.test(formData.phone.replace(/\s/g, ''))) {
    errors.phone = VALIDATION_MESSAGES.INVALID_PHONE;
  }

  if (!formData.owner_id) {
    errors.owner_id = VALIDATION_MESSAGES.REQUIRED_OWNER;
  }

  if (!formData.manager_id) {
    errors.manager_id = VALIDATION_MESSAGES.REQUIRED_MANAGER;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Creates empty form data
 */
export const createEmptyForm = (): EditFormData => ({ ...DEFAULT_KURS_FORM });

/**
 * Converts kurs data to form data
 */
export const kursToFormData = (kurs: KursExtended): EditFormData => ({
  name: kurs.name || '',
  address: kurs.address || '',
  phone: kurs.phone || '',
  owner_id: kurs.owner_id ? kurs.owner_id.toString() : '',
  manager_id: kurs.manager_id ? kurs.manager_id.toString() : '',
  city_id: kurs.city_id ? kurs.city_id.toString() : '',
  district_id: kurs.district_id ? kurs.district_id.toString() : '',
  subscription_type: 'demo', // Default value, should come from API in real implementation
  subscription_duration: 'monthly' // Default value, should come from API in real implementation
});

/**
 * Formats phone number for display
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
  }
  
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 8)} ${cleaned.slice(8)}`;
  }
  
  return phone;
};

/**
 * Safely gets owner name by ID
 */
export const getOwnerNameById = (
  owner_id: string | number | null | undefined,
  owners: Owner[]
): string => {
  if (!owner_id) return "-";
  const id = owner_id.toString();
  const owner = owners.find(o => o.id === id);
  return owner?.name || "-";
};

/**
 * Safely gets manager name by ID
 */
export const getManagerNameById = (
  manager_id: string | number | null | undefined,
  managers: Manager[]
): string => {
  if (!manager_id) return "-";
  const id = manager_id.toString();
  const manager = managers.find(m => m.id === id);
  return manager?.name || "-";
};

/**
 * Filters kurslar based on search text
 */
export const filterKurslar = (
  kurslar: KursExtended[],
  searchText: string,
  owners: Owner[],
  managers: Manager[]
): KursExtended[] => {
  if (!searchText.trim()) return kurslar;

  const searchTerm = searchText.toLowerCase();

  return kurslar.filter(kurs => {
    const ownerName = getOwnerNameById(kurs.owner_id, owners).toLowerCase();
    const managerName = getManagerNameById(kurs.manager_id, managers).toLowerCase();

    return (
      (kurs.name && kurs.name.toLowerCase().includes(searchTerm)) ||
      (kurs.address && kurs.address.toLowerCase().includes(searchTerm)) ||
      (kurs.phone && kurs.phone.toLowerCase().includes(searchTerm)) ||
      ownerName.includes(searchTerm) ||
      managerName.includes(searchTerm)
    );
  });
};

/**
 * Sorts kurslar array by specified field and direction
 */
export const sortKurslar = (
  kurslar: KursExtended[],
  field: keyof KursExtended,
  direction: 'asc' | 'desc'
): KursExtended[] => {
  return [...kurslar].sort((a, b) => {
    const aVal = a[field] || '';
    const bVal = b[field] || '';

    let comparison = 0;
    if (aVal < bVal) comparison = -1;
    if (aVal > bVal) comparison = 1;

    return direction === 'desc' ? comparison * -1 : comparison;
  });
};

/**
 * Debounce function for search input
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Formats date for display
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formats datetime for display
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Generates a unique ID (simple implementation)
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Checks if a value is empty (null, undefined, empty string, or whitespace)
 */
export const isEmpty = (value: any): boolean => {
  return value === null || value === undefined || value === '' || 
         (typeof value === 'string' && value.trim() === '');
};

/**
 * Capitalizes first letter of a string
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Truncates text to specified length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Safely parses JSON with fallback
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
};

/**
 * Creates select options from array of objects
 */
export const createSelectOptions = <T extends { id: string | number; name: string }>(
  items: T[],
  emptyOption?: { value: string; label: string }
) => {
  const options = items.map(item => ({
    value: item.id.toString(),
    label: item.name
  }));

  if (emptyOption) {
    return [emptyOption, ...options];
  }

  return options;
};

/**
 * Validates Turkish phone number format
 */
export const isValidTurkishPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  
  // Turkish mobile: 5XX XXX XX XX (10 digits) or 0 5XX XXX XX XX (11 digits)
  // Turkish landline: 2XX XXX XX XX (10 digits) or 0 2XX XXX XX XX (11 digits)
  
  if (cleaned.length === 10) {
    return /^[2-5][0-9]{9}$/.test(cleaned);
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return /^0[2-5][0-9]{9}$/.test(cleaned);
  }
  
  return false;
};
