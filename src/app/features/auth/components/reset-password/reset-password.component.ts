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
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { RouterModule } from "@angular/router";

import { MaterialModule } from "../../../../shared/material.module";
import { ResetPasswordFormData } from "../../../../../types";
import {
  AuthValidationError,
  AUTH_ERROR_MESSAGES,
  AUTH_VALIDATION_CONSTRAINTS,
} from "../../types/auth-validation";

@Component({
  selector: "app-reset-password",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule],
  templateUrl: "./reset-password.component.html",
  styleUrl: "./reset-password.component.scss",
})
export class ResetPasswordComponent implements OnInit {
  @Output() readonly resetPasswordSubmit =
    new EventEmitter<ResetPasswordFormData>();

  // Inject services
  private readonly fb = inject(FormBuilder);

  // Form and state
  resetPasswordForm!: FormGroup;
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly isEmailSent = signal<boolean>(false);
  protected readonly validationErrors = signal<AuthValidationError[]>([]);

  // Constants for template
  readonly errorMessages = AUTH_ERROR_MESSAGES;
  readonly constraints = AUTH_VALIDATION_CONSTRAINTS;

  // Computed getters for template
  get isFormValid(): boolean {
    return this.resetPasswordForm?.valid && !this.isSubmitting();
  }

  get submitButtonText(): string {
    return this.isSubmitting() ? "Wysyłanie..." : "Wyślij link resetujący";
  }

  get formTitle(): string {
    return this.isEmailSent() ? "Link został wysłany" : "Resetuj hasło";
  }

  get formSubtitle(): string {
    return this.isEmailSent()
      ? "Sprawdź swoją skrzynkę mailową"
      : "Wprowadź adres email, aby otrzymać link do resetowania hasła";
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormValidation();
  }

  /**
   * Initialize reactive form with validators
   */
  private initializeForm(): void {
    this.resetPasswordForm = this.fb.group({
      email: [
        "",
        [
          Validators.required,
          Validators.email,
          Validators.maxLength(this.constraints.email.maxLength),
          Validators.pattern(this.constraints.email.pattern),
        ],
      ],
    });
  }

  /**
   * Setup form validation with real-time feedback
   */
  private setupFormValidation(): void {
    // Add value change listeners for real-time validation
    Object.keys(this.resetPasswordForm.controls).forEach((key) => {
      const control = this.resetPasswordForm.get(key);
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

    Object.keys(this.resetPasswordForm.controls).forEach((fieldName) => {
      const control = this.resetPasswordForm.get(fieldName);
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

    if (controlErrors["maxlength"]) {
      errors.push({
        field: fieldName,
        message: `Adres email może mieć maksymalnie ${controlErrors["maxlength"].requiredLength} znaków`,
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
    const control = this.resetPasswordForm.get(fieldName);
    return !!(control && control.errors && (control.dirty || control.touched));
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (!this.isFormValid || this.isEmailSent()) {
      this.markAllFieldsAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.resetPasswordForm.value;
    const resetPasswordData: ResetPasswordFormData = {
      email: formValue.email.trim().toLowerCase(),
    };

    // Emit reset password data to parent component
    this.resetPasswordSubmit.emit(resetPasswordData);
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markAllFieldsAsTouched(): void {
    Object.keys(this.resetPasswordForm.controls).forEach((key) => {
      this.resetPasswordForm.get(key)?.markAsTouched();
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
   * Mark email as sent (to be called by parent after successful submission)
   */
  markEmailAsSent(): void {
    this.isEmailSent.set(true);
    this.isSubmitting.set(false);
  }

  /**
   * Reset the email sent state to allow resending
   */
  resetEmailSentState(): void {
    this.isEmailSent.set(false);
  }

  /**
   * Set form errors from external source (e.g., server validation)
   */
  setFormErrors(errors: AuthValidationError[]): void {
    this.validationErrors.set(errors);

    // Mark relevant fields as touched to show errors
    errors.forEach((error) => {
      const control = this.resetPasswordForm.get(error.field);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  /**
   * Resend reset email
   */
  onResendEmail(): void {
    if (this.isSubmitting()) return;

    this.resetEmailSentState();
    this.onSubmit();
  }
}
