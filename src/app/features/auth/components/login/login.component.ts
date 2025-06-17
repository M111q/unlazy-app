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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  ValidationErrors,
} from "@angular/forms";
import { RouterModule } from "@angular/router";

import { MaterialModule } from "../../../../shared/material.module";
import { LoginFormData } from "../../../../../types";
import {
  AuthValidationError,
  AUTH_ERROR_MESSAGES,
  AUTH_VALIDATION_CONSTRAINTS,
} from "../../types/auth-validation";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.scss",
})
export class LoginComponent implements OnInit {
  @Output() readonly loginSubmit = new EventEmitter<LoginFormData>();

  // Inject services
  private readonly fb = inject(FormBuilder);

  // Form and state
  loginForm!: FormGroup;
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly validationErrors = signal<AuthValidationError[]>([]);
  protected readonly hidePassword = signal<boolean>(true);

  // Constants for template
  readonly errorMessages = AUTH_ERROR_MESSAGES;
  readonly constraints = AUTH_VALIDATION_CONSTRAINTS;

  // Computed getters for template
  get isFormValid(): boolean {
    return this.loginForm?.valid && !this.isSubmitting();
  }

  get submitButtonText(): string {
    return this.isSubmitting() ? "Logowanie..." : "Zaloguj się";
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormValidation();
  }

  /**
   * Initialize reactive form with validators
   */
  private initializeForm(): void {
    this.loginForm = this.fb.group({
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
        ],
      ],
    });
  }

  /**
   * Setup form validation with real-time feedback
   */
  private setupFormValidation(): void {
    // Add value change listeners for real-time validation
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      if (control) {
        control.valueChanges.subscribe(() => {
          this.updateValidationErrors();
        });
      }
    });
  }

  /**
   * Update validation errors based on form state
   */
  private updateValidationErrors(): void {
    const errors: AuthValidationError[] = [];

    Object.keys(this.loginForm.controls).forEach((fieldName) => {
      const control = this.loginForm.get(fieldName);
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
    const control = this.loginForm.get(fieldName);
    return !!(control && control.errors && (control.dirty || control.touched));
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
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

    const formValue = this.loginForm.value;
    const loginData: LoginFormData = {
      email: formValue.email.trim().toLowerCase(),
      password: formValue.password,
    };

    // Emit login data to parent component
    this.loginSubmit.emit(loginData);
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      this.loginForm.get(key)?.markAsTouched();
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
      const control = this.loginForm.get(error.field);
      if (control) {
        control.markAsTouched();
      }
    });
  }
}
