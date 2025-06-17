// Validation error interface for auth forms
export interface AuthValidationError {
  field: string;
  message: string;
  code: AuthErrorCode;
}

// Auth-specific error codes
export type AuthErrorCode =
  | 'REQUIRED'
  | 'EMAIL_INVALID'
  | 'EMAIL_TAKEN'
  | 'PASSWORD_TOO_SHORT'
  | 'PASSWORD_TOO_WEAK'
  | 'PASSWORDS_MISMATCH'
  | 'MIN_LENGTH'
  | 'MAX_LENGTH'
  | 'PATTERN_MISMATCH'
  | 'USER_NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMIT_EXCEEDED';

// Field validation state for reactive forms
export interface FieldValidationState {
  isValid: boolean;
  errors: AuthValidationError[];
  touched: boolean;
  dirty: boolean;
}

// Form validation state
export interface FormValidationState {
  isValid: boolean;
  isSubmitting: boolean;
  errors: AuthValidationError[];
  fieldStates: Record<string, FieldValidationState>;
}

// Password strength levels
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

// Password validation result
export interface PasswordValidationResult {
  strength: PasswordStrength;
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

// Auth form field names for type safety
export type LoginFormField = 'email' | 'password';
export type RegisterFormField = 'email' | 'password' | 'confirmPassword';
export type ResetPasswordFormField = 'email';
export type UpdatePasswordFormField = 'password' | 'confirmPassword';

// Validation constraints
export interface AuthValidationConstraints {
  email: {
    required: boolean;
    pattern: RegExp;
    maxLength: number;
  };
  password: {
    required: boolean;
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}

// Default validation constraints
export const AUTH_VALIDATION_CONSTRAINTS: AuthValidationConstraints = {
  email: {
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    maxLength: 254
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }
};

// Auth validation error messages
export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  REQUIRED: 'To pole jest wymagane',
  EMAIL_INVALID: 'Podaj prawidłowy adres email',
  EMAIL_TAKEN: 'Ten adres email jest już zajęty',
  PASSWORD_TOO_SHORT: 'Hasło musi mieć co najmniej 8 znaków',
  PASSWORD_TOO_WEAK: 'Hasło jest zbyt słabe',
  PASSWORDS_MISMATCH: 'Hasła nie są identyczne',
  MIN_LENGTH: 'Wartość jest za krótka',
  MAX_LENGTH: 'Wartość jest za długa',
  PATTERN_MISMATCH: 'Nieprawidłowy format',
  USER_NOT_FOUND: 'Użytkownik nie został znaleziony',
  INVALID_CREDENTIALS: 'Nieprawidłowy email lub hasło',
  EMAIL_NOT_CONFIRMED: 'Potwierdź swój adres email',
  ACCOUNT_LOCKED: 'Konto zostało zablokowane',
  RATE_LIMIT_EXCEEDED: 'Zbyt wiele prób. Spróbuj ponownie później'
};

// Password strength messages
export const PASSWORD_STRENGTH_MESSAGES: Record<PasswordStrength, string> = {
  weak: 'Słabe hasło',
  fair: 'Średnie hasło',
  good: 'Dobre hasło',
  strong: 'Silne hasło'
};
