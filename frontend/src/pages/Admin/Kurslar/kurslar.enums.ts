// Enums for Kurslar page

/**
 * Modal types for different kurs operations
 */
export enum KursModalType {
  ADD = 'add',
  EDIT = 'edit',
  VIEW = 'view',
  DELETE = 'delete'
}

/**
 * Kurs status enumeration
 */
export enum KursStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  SUSPENDED = 'suspended'
}

/**
 * Form validation error types
 */
export enum ValidationErrorType {
  REQUIRED_FIELD = 'required_field',
  INVALID_FORMAT = 'invalid_format',
  DUPLICATE_ENTRY = 'duplicate_entry',
  INVALID_SELECTION = 'invalid_selection'
}

/**
 * API operation types
 */
export enum ApiOperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  FETCH_ALL = 'fetch_all'
}

/**
 * Loading states for different operations
 */
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error'
}

/**
 * View modes for responsive design
 */
export enum ViewMode {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet'
}
