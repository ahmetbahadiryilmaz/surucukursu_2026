import { KursModalType, KursStatus, ApiOperationType } from './kurslar.enums';

// ===== FORM DATA TYPES =====

/**
 * Kurs form data interface for creating and editing
 */
export interface EditFormData {
  name: string;
  address: string;
  phone: string;
  owner_id: string;
  manager_id: string;
  city_id: string;
  district_id: string;
  // Subscription fields
  subscription_type: string; // 'demo' or 'unlimited'
  subscription_duration: string; // 'monthly' or 'yearly' (for create), or custom date (for update)
  subscription_ends_at?: string; // Custom end date for updates
}

/**
 * Form validation result
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
  name: keyof EditFormData;
  label: string;
  type: 'text' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: SelectOption[];
}

// ===== ENTITY TYPES =====

/**
 * Kurs owner interface
 */
export interface Owner {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Kurs manager interface
 */
export interface Manager {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * City interface
 */
export interface City {
  id: string;
  name: string;
  districts?: District[];
}

/**
 * District interface
 */
export interface District {
  id: string;
  name: string;
  city_id: number;
}

/**
 * Extended driving school interface
 */
export interface KursExtended {
  id: string;
  name: string;
  address: string;
  phone: string;
  owner_id: string | number;
  manager_id: string | number;
  city_id?: string | number;
  district_id?: string | number;
  status?: KursStatus;
  owner?: Owner;
  manager?: Manager;
  city?: City;
  district?: District;
  created_at?: string;
  updated_at?: string;
}

// ===== UI STATE TYPES =====

/**
 * Modal state interface
 */
export interface ModalState {
  type: KursModalType | null;
  isOpen: boolean;
  data?: any;
  error?: string | null;
}

/**
 * Loading state for different operations
 */
export interface OperationLoadingState {
  [ApiOperationType.CREATE]: boolean;
  [ApiOperationType.READ]: boolean;
  [ApiOperationType.UPDATE]: boolean;
  [ApiOperationType.DELETE]: boolean;
  [ApiOperationType.FETCH_ALL]: boolean;
}

/**
 * Filter state interface
 */
export interface FilterState {
  searchText: string;
  selectedCity: string;
  selectedDistrict: string;
  selectedOwner: string;
  selectedManager: string;
  statusFilter: KursStatus | 'all';
}

// ===== COMPONENT PROPS TYPES =====

/**
 * Base component props
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Kurs card component props
 */
export interface KursCardProps extends BaseComponentProps {
  kurs: KursExtended;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onViewDetails: (kurs: KursExtended) => void;
  getOwnerName: (owner_id: string | number | null | undefined) => string;
  getManagerName: (manager_id: string | number | null | undefined) => string;
}

/**
 * Kurs table component props
 */
export interface KursTableProps extends BaseComponentProps {
  kurslar: KursExtended[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getOwnerName: (owner_id: string | number | null | undefined) => string;
  getManagerName: (manager_id: string | number | null | undefined) => string;
  filterText: string;
  loading?: boolean;
}

/**
 * Toolbar component props
 */
export interface KursToolbarProps extends BaseComponentProps {
  filterText: string;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
  loading: boolean;
  totalCount?: number;
}

/**
 * Modal form props
 */
export interface KursFormModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  formData: EditFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { name: string; value: string | number }) => void;
  owners: Owner[];
  managers: Manager[];
  cities: City[];
  districts: District[];
  error?: string | null;
  loading?: boolean;
}

// ===== HOOK TYPES =====

/**
 * useKurslar hook return type
 */
export interface UseKurslarReturn {
  kurslar: KursExtended[];
  loading: boolean;
  error: string | null;
  owners: Owner[];
  managers: Manager[];
  cities: City[];
  districts: District[];
  fetchKurslar: (showToast?: boolean) => Promise<void>;
  fetchOwnersAndManagers: () => Promise<void>;
  fetchCitiesAndDistricts: () => Promise<void>;
  createKurs: (formData: EditFormData) => Promise<boolean>;
  updateKurs: (id: string, formData: EditFormData) => Promise<boolean>;
  deleteKurs: (id: string) => Promise<boolean>;
  getOwnerName: (owner_id: string | number | null | undefined) => string;
  getManagerName: (manager_id: string | number | null | undefined) => string;
}

/**
 * useKursFilter hook return type
 */
export interface UseKursFilterReturn {
  filterText: string;
  setFilterText: (text: string) => void;
  filteredKurslar: KursExtended[];
  filterState: FilterState;
  setFilterState: (state: Partial<FilterState>) => void;
}

/**
 * useResponsive hook return type
 */
export interface UseResponsiveReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: 'mobile' | 'tablet' | 'desktop';
}

// ===== UTILITY TYPES =====

/**
 * Select option interface
 */
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}



/**
 * Pagination interface
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: keyof KursExtended;
  direction: 'asc' | 'desc';
}

/**
 * Toast notification type
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}
