// Login Form-specific types (UI layer)

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormValidation {
  isValid: boolean;
  errors: string[];
}

export interface LoginFormState {
  email: string;
  password: string;
  isLoading: boolean;
  error: string | null;
}