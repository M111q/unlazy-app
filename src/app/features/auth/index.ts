// Auth Feature Module Exports

// Pages
export { AuthPageComponent } from "./pages/auth-page/auth-page.component";

// Components
export { AuthLayoutComponent } from "./components/auth-layout/auth-layout.component";
export { LoginComponent } from "./components/login/login.component";
export { RegisterComponent } from "./components/register/register.component";
export { ResetPasswordComponent } from "./components/reset-password/reset-password.component";

// Types
export type {
  AuthValidationError,
  AuthErrorCode,
  FieldValidationState,
  FormValidationState,
  PasswordStrength,
  PasswordValidationResult,
  LoginFormField,
  RegisterFormField,
  ResetPasswordFormField,
  UpdatePasswordFormField,
  AuthValidationConstraints,
} from "./types/auth-validation";

// Constants
export {
  AUTH_VALIDATION_CONSTRAINTS,
  AUTH_ERROR_MESSAGES,
  PASSWORD_STRENGTH_MESSAGES,
} from "./types/auth-validation";
