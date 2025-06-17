import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { RouterModule } from "@angular/router";

import { MaterialModule } from "../../../../shared/material.module";
import { RegisterFormData } from "../../../../../types";
import {
  AuthValidationError,
  AUTH_ERROR_MESSAGES,
  AUTH_VALIDATION_CONSTRAINTS,
  PasswordStrength,
  PasswordValidationResult,
  PASSWORD_STRENGTH_MESSAGES,
} from "../../types/auth-validation";

@Component({
  selector: "app-register",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule],
  templateUrl: "./register.component.html",
  styleUrl: "./register.component.scss",
})
export class RegisterComponent implements OnInit {
  @Output() readonly registerSubmit = new EventEmitter<RegisterFormData>();

  // Inject services
  private readonly fb = inject(FormBuilder);

  // Form and state
  registerForm!: FormGroup;
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly validationErrors = signal<AuthValidationError[]>([]);
  protected readonly hidePassword = signal<boolean>(true);
  protected readonly hideConfirmPassword = signal<boolean>(true);
  protected readonly passwordStrength = signal<PasswordValidationResult>({
    strength: "weak",
    score: 0,
    feedback: [],
    isValid: false,
  });

  // Constants for template
  readonly errorMessages = AUTH_ERROR_MESSAGES;
  readonly constraints = AUTH_VALIDATION_CONSTRAINTS;
  readonly strengthMessages = PASSWORD_STRENGTH_MESSAGES;

  // Computed getters for template
  get isFormValid(): boolean {
    return this.registerForm?.valid && !this.isSubmitting();
  }

  get submitButtonText(): string {
    return this.isSubmitting() ? "Rejestrowanie..." : "Utwórz konto";
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormValidation();
  }

  /**
   * Initialize reactive form with validators
   */
  private initializeForm(): void {
    this.registerForm = this.fb.group(
      {
        email: [
          "",
          [
            Validators.required,
            Validators.email,
            Validators.maxLength(this.constraints.email.maxLength),
            Validators.pattern(this.constraints.email.pattern),
          ],
        ],
        password: [
          "",
          [
            Validators.required,
            Validators.minLength(this.constraints.password.minLength),
            Validators.maxLength(this.constraints.password.maxLength),
            this.passwordStrengthValidator.bind(this),
          ],
        ],
        confirmPassword: ["", [Validators.required]],
      },
      {
        validators: [this.passwordMatchValidator.bind(this)],
      },
    );
  }

  /**
   * Setup form validation with real-time feedback
   */
  private setupFormValidation(): void {
    // Add value change listeners for real-time validation
    Object.keys(this.registerForm.controls).forEach((key) => {
      const control = this.registerForm.get(key);
      if (control) {
        control.valueChanges.subscribe(() => {
          if (key === "password") {
            this.updatePasswordStrength();
          }
          this.updateValidationErrors();
        });
      }
    });
  }

  /**
   * Custom validator for password strength
   */
  private passwordStrengthValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    if (!control.value) return null;

    const result = this.evaluatePasswordStrength(control.value);

    if (!result.isValid) {
      return { passwordTooWeak: true };
    }

    return null;
  }

  /**
   * Custom validator for password confirmation match
   */
  private passwordMatchValidator(
    control: AbstractControl,
  ): ValidationErrors | null {
    const password = control.get("password");
    const confirmPassword = control.get("confirmPassword");

    if (
      !password ||
      !confirmPassword ||
      !password.value ||
      !confirmPassword.value
    ) {
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({
        ...confirmPassword.errors,
        passwordMismatch: true,
      });
      return { passwordMismatch: true };
    } else {
      // Remove passwordMismatch error if passwords match
      if (confirmPassword.errors) {
        delete confirmPassword.errors["passwordMismatch"];
        if (Object.keys(confirmPassword.errors).length === 0) {
          confirmPassword.setErrors(null);
        }
      }
    }

    return null;
  }

  /**
   * Evaluate password strength
   */
  private evaluatePasswordStrength(password: string): PasswordValidationResult {
    let score = 0;
    const feedback: string[] = [];

    // Length check
    if (password.length >= 8) score++;
    else feedback.push("Użyj co najmniej 8 znaków");

    // Uppercase check
    if (/[A-Z]/.test(password)) score++;
    else feedback.push("Dodaj wielką literę");

    // Lowercase check
    if (/[a-z]/.test(password)) score++;
    else feedback.push("Dodaj małą literę");

    // Number check
    if (/\d/.test(password)) score++;
    else feedback.push("Dodaj cyfrę");

    // Special character check
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
    else feedback.push("Dodaj znak specjalny");

    // Determine strength
    let strength: PasswordStrength;
    if (score < 2) strength = "weak";
    else if (score < 3) strength = "fair";
    else if (score < 4) strength = "good";
    else strength = "strong";

    return {
      strength,
      score,
      feedback,
      isValid: score >= 3, // Require at least 3 criteria
    };
  }

  /**
   * Update password strength indicator
   */
  private updatePasswordStrength(): void {
    const passwordControl = this.registerForm.get("password");
    if (passwordControl && passwordControl.value) {
      const result = this.evaluatePasswordStrength(passwordControl.value);
      this.passwordStrength.set(result);
    } else {
      this.passwordStrength.set({
        strength: "weak",
        score: 0,
        feedback: [],
        isValid: false,
      });
    }
  }

  /**
   * Update validation errors based on form state
   */
  private updateValidationErrors(): void {
    const errors: AuthValidationError[] = [];

    Object.keys(this.registerForm.controls).forEach((fieldName) => {
      const control = this.registerForm.get(fieldName);
      if (control && control.errors && (control.dirty || control.touched)) {
        const fieldErrors = this.getFieldErrors(fieldName, control.errors);
        errors.push(...fieldErrors);
      }
    });

    this.validationErrors.set(errors);
  }

  /**
   * Get validation errors for a specific field
   */
  private getFieldErrors(
    fieldName: string,
    controlErrors: ValidationErrors,
  ): AuthValidationError[] {
    const errors: AuthValidationError[] = [];

    if (controlErrors["required"]) {
      errors.push({
        field: fieldName,
        message: this.getRequiredMessage(fieldName),
        code: "REQUIRED",
      });
    }

    if (controlErrors["email"]) {
      errors.push({
        field: fieldName,
        message: this.errorMessages.EMAIL_INVALID,
        code: "EMAIL_INVALID",
      });
    }

    if (controlErrors["pattern"]) {
      errors.push({
        field: fieldName,
        message: this.errorMessages.EMAIL_INVALID,
        code: "PATTERN_MISMATCH",
      });
    }

    if (controlErrors["minlength"]) {
      errors.push({
        field: fieldName,
        message: `${fieldName === "password" ? "Hasło" : "Wartość"} musi mieć co najmniej ${controlErrors["minlength"].requiredLength} znaków`,
        code: "MIN_LENGTH",
      });
    }

    if (controlErrors["maxlength"]) {
      errors.push({
        field: fieldName,
        message: `${fieldName === "password" ? "Hasło" : "Wartość"} może mieć maksymalnie ${controlErrors["maxlength"].requiredLength} znaków`,
        code: "MAX_LENGTH",
      });
    }

    if (controlErrors["passwordTooWeak"]) {
      errors.push({
        field: fieldName,
        message: this.errorMessages.PASSWORD_TOO_WEAK,
        code: "PASSWORD_TOO_WEAK",
      });
    }

    if (controlErrors["passwordMismatch"]) {
      errors.push({
        field: fieldName,
        message: this.errorMessages.PASSWORDS_MISMATCH,
        code: "PASSWORDS_MISMATCH",
      });
    }

    return errors;
  }

  /**
   * Get required field message
   */
  private getRequiredMessage(fieldName: string): string {
    switch (fieldName) {
      case "email":
        return "Adres email jest wymagany";
      case "password":
        return "Hasło jest wymagane";
      case "confirmPassword":
        return "Potwierdzenie hasła jest wymagane";
      default:
        return "To pole jest wymagane";
    }
  }

  /**
   * Get error message for a specific field
   */
  getFieldError(fieldName: string): string | null {
    const fieldErrors = this.validationErrors().filter(
      (error) => error.field === fieldName,
    );
    return fieldErrors.length > 0 ? fieldErrors[0].message : null;
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control && control.errors && (control.dirty || control.touched));
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  /**
   * Toggle confirm password visibility
   */
  toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
  }

  /**
   * Get password strength class for styling
   */
  getPasswordStrengthClass(): string {
    return `strength-${this.passwordStrength().strength}`;
  }

  /**
   * Get password strength progress value
   */
  getPasswordStrengthProgress(): number {
    return (this.passwordStrength().score / 4) * 100;
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (!this.isFormValid) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.registerForm.value;
    const registerData: RegisterFormData = {
      email: formValue.email.trim().toLowerCase(),
      password: formValue.password,
      confirmPassword: formValue.confirmPassword,
    };

    // Emit registration data to parent component
    this.registerSubmit.emit(registerData);
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.registerForm.controls).forEach((key) => {
      this.registerForm.get(key)?.markAsTouched();
    });
    this.updateValidationErrors();
  }

  /**
   * Reset form submission state (to be called by parent after handling)
   */
  resetSubmissionState(): void {
    this.isSubmitting.set(false);
  }

  /**
   * Set form errors from external source (e.g., server validation)
   */
  setFormErrors(errors: AuthValidationError[]): void {
    this.validationErrors.set(errors);

    // Mark relevant fields as touched to show errors
    errors.forEach((error) => {
      const control = this.registerForm.get(error.field);
      if (control) {
        control.markAsTouched();
      }
    });
  }
}
