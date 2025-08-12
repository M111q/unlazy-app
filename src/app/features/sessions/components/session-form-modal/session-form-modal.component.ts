import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";

import { MaterialModule } from "../../../../shared/material.module";
import {
  SessionItemViewModel,
  ValidationError,
} from "../../types/sessions-view-models";
import { CreateSessionDto, UpdateSessionDto } from "../../../../../types";
import { ERROR_MESSAGES, FIELD_LIMITS } from "../../../../constants";

export interface SessionFormModalData {
  mode: "create" | "edit";
  session?: SessionItemViewModel;
}

@Component({
  selector: "app-session-form-modal",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: "./session-form-modal.component.html",
  styleUrl: "./session-form-modal.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionFormModalComponent implements OnInit {
  // Injected dependencies
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SessionFormModalComponent>);
  public readonly data = inject<SessionFormModalData>(MAT_DIALOG_DATA);

  // Form and state
  sessionForm!: FormGroup;
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly validationErrors = signal<ValidationError[]>([]);

  // Constants for template
  readonly fieldLimits = FIELD_LIMITS;
  readonly errorMessages = ERROR_MESSAGES;

  // Computed getters for template
  get isCreateMode(): boolean {
    return this.data.mode === "create";
  }

  get isEditMode(): boolean {
    return this.data.mode === "edit";
  }

  get modalTitle(): string {
    return this.isCreateMode ? "Dodaj nową sesję" : "Edytuj sesję";
  }

  get submitButtonText(): string {
    return this.isSubmitting()
      ? this.isCreateMode
        ? "Dodawanie..."
        : "Zapisywanie..."
      : this.isCreateMode
        ? "Dodaj sesję"
        : "Zapisz zmiany";
  }

  get isFormValid(): boolean {
    return this.sessionForm?.valid && !this.isSubmitting();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormValidation();
  }

  /**
   * Initialize reactive form with validators
   */
  private initializeForm(): void {
    const sessionData = this.data.session;

    // Format datetime for datetime-local input (YYYY-MM-DDTHH:MM)
    const defaultDatetime = sessionData?.sessionDatetime
      ? this.formatDateForInput(sessionData.sessionDatetime)
      : this.formatDateForInput(new Date());

    this.sessionForm = this.fb.group({
      sessionDatetime: [
        defaultDatetime,
        [Validators.required, this.futureDateValidator.bind(this)],
      ],
      description: [
        sessionData?.description || "",
        [Validators.maxLength(FIELD_LIMITS.DESCRIPTION_MAX_LENGTH)],
      ],
      location: [
        sessionData?.location || "",
        [Validators.maxLength(FIELD_LIMITS.LOCATION_MAX_LENGTH)],
      ],
    });
  }

  /**
   * Setup form validation with real-time feedback
   */
  private setupFormValidation(): void {
    // Add blur event listeners for real-time validation
    Object.keys(this.sessionForm.controls).forEach((key) => {
      const control = this.sessionForm.get(key);
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
    const errors: ValidationError[] = [];

    Object.keys(this.sessionForm.controls).forEach((fieldName) => {
      const control = this.sessionForm.get(fieldName);
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
    controlErrors: Record<string, unknown>,
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (controlErrors["required"]) {
      errors.push({
        field: fieldName,
        message: this.getRequiredMessage(fieldName),
        code: "REQUIRED",
      });
    }

    if (controlErrors["maxlength"]) {
      errors.push({
        field: fieldName,
        message: this.getMaxLengthMessage(fieldName),
        code: "MAX_LENGTH",
      });
    }

    if (controlErrors["futureDate"]) {
      errors.push({
        field: fieldName,
        message: "Data sesji nie może być w przyszłości",
        code: "FUTURE_DATE",
      });
    }

    if (controlErrors["duplicateTime"]) {
      errors.push({
        field: fieldName,
        message: "Sesja o tym czasie już istnieje",
        code: "DUPLICATE_TIME",
      });
    }

    return errors;
  }

  /**
   * Get required field message
   */
  private getRequiredMessage(fieldName: string): string {
    switch (fieldName) {
      case "sessionDatetime":
        return "Data i godzina sesji są wymagane";
      default:
        return "To pole jest wymagane";
    }
  }

  /**
   * Get max length message
   */
  private getMaxLengthMessage(fieldName: string): string {
    switch (fieldName) {
      case "description":
        return ERROR_MESSAGES.DESCRIPTION_TOO_LONG;
      case "location":
        return ERROR_MESSAGES.LOCATION_TOO_LONG;
      default:
        return "Wartość jest za długa";
    }
  }

  /**
   * Custom validator for future date
   */
  private futureDateValidator(control: {
    value?: string;
  }): ValidationErrors | null {
    if (!control.value) return null;

    const selectedDate = new Date(control.value);
    const now = new Date();

    if (selectedDate > now) {
      return { futureDate: true };
    }

    return null;
  }

  /**
   * Format date for datetime-local input
   */
  private formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
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
    const control = this.sessionForm.get(fieldName);
    return !!(control && control.errors && (control.dirty || control.touched));
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (!this.isFormValid) return;

    this.isSubmitting.set(true);

    const formValue = this.sessionForm.value;

    // Create DTO based on mode
    const sessionData = this.createSessionDto(formValue);

    // Emit the data and close modal
    this.dialogRef.close(sessionData);
  }

  /**
   * Create session DTO from form values
   */
  private createSessionDto(formValue: {
    sessionDatetime: string;
    description?: string;
    location?: string;
  }): CreateSessionDto | UpdateSessionDto {
    const baseDto = {
      session_datetime: new Date(formValue.sessionDatetime).toISOString(),
      description: formValue.description?.trim() || null,
      location: formValue.location?.trim() || null,
    };

    if (this.isCreateMode) {
      return baseDto as CreateSessionDto;
    } else {
      return baseDto as UpdateSessionDto;
    }
  }

  /**
   * Handle form cancellation
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Handle dialog close via backdrop or escape
   */
  onNoClick(): void {
    this.dialogRef.close();
  }
}
