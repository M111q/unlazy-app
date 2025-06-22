import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";

import { MaterialModule } from "../../../../shared/material.module";
import { ExerciseSetWithExercise } from "../../../../../types";
import { EXERCISE_SET_LIMITS } from "../../../../constants";

@Component({
  selector: "app-session-set-item",
  standalone: true,
  imports: [CommonModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="d-flex align-center justify-between p-md border rounded-md bg-white card-interactive"
      [class.invalid-field]="!isValidSet()"
      [class.deleting-animation]="isDeleting"
    >
      <div class="d-flex flex-column gap-xs flex-grow-1">
        <div class="d-flex align-center gap-xs mb-xs">
          <mat-icon class="text-primary">fitness_center</mat-icon>
          <strong class="text-primary font-medium text-base mobile-text-sm">{{
            set.exercises.name
          }}</strong>
          <mat-icon
            *ngIf="!isValidSet()"
            class="text-warning text-lg"
            matTooltip="{{ getValidationWarnings().join('; ') }}"
            matTooltipClass="validation-tooltip"
            aria-label="Ostrzeżenia walidacji"
          >
            warning
          </mat-icon>
        </div>
        <div class="d-flex gap-md mobile-stack text-secondary text-sm">
          <span class="d-flex align-center gap-xs position-relative">
            <span class="font-medium" [class.invalid-field]="!isValidReps()">
              {{ validatedReps }} {{ getRepsLabel(validatedReps) }}
            </span>
            <mat-icon
              *ngIf="!isValidReps()"
              class="text-error text-sm"
              [matTooltip]="getRepsValidationMessage()"
              matTooltipClass="validation-tooltip"
              aria-label="Nieprawidłowa liczba powtórzeń"
            >
              error_outline
            </mat-icon>
          </span>
          <span class="d-flex align-center gap-xs">
            <span class="font-medium" [class.invalid-field]="!isValidWeight()">
              {{ formattedWeight }} kg
            </span>
            <mat-icon
              *ngIf="!isValidWeight()"
              class="text-error text-sm"
              [matTooltip]="getWeightValidationMessage()"
              matTooltipClass="validation-tooltip"
              aria-label="Nieprawidłowy ciężar"
            >
              error_outline
            </mat-icon>
          </span>
        </div>
      </div>
      <div class="d-flex gap-xs flex-shrink-0 align-center mobile-center">
        <button
          mat-icon-button
          (click)="handleEdit()"
          [attr.aria-label]="getEditAriaLabel()"
          [disabled]="disabled || isDeleting"
          matTooltip="Edytuj serię"
          class="action-btn action-btn-edit"
        >
          <mat-icon>edit</mat-icon>
        </button>
        <button
          mat-icon-button
          (click)="handleDelete()"
          [attr.aria-label]="getDeleteAriaLabel()"
          [disabled]="disabled || isDeleting"
          matTooltip="Usuń serię"
          class="action-btn action-btn-delete"
        >
          <mat-spinner *ngIf="isDeleting" diameter="16"></mat-spinner>
          <mat-icon *ngIf="!isDeleting">delete</mat-icon>
        </button>
      </div>
    </div>
  `,
  styleUrls: ["./session-set-item.component.scss"],
})
export class SessionSetItemComponent {
  @Input({ required: true }) set!: ExerciseSetWithExercise;
  @Input() isDeleting = false;
  @Input() disabled = false;

  @Output() editSet = new EventEmitter<number>();
  @Output() deleteSet = new EventEmitter<number>();

  /**
   * Get validated reps value
   * Ensures the value is within acceptable range
   */
  protected get validatedReps(): number {
    const reps = this.set?.reps || 0;
    return Math.max(0, Math.min(reps, EXERCISE_SET_LIMITS.REPS_MAX));
  }

  /**
   * Get validated weight value
   * Ensures the value is within acceptable range
   */
  protected get validatedWeight(): number {
    const weight = this.set?.weight || 0;
    return Math.max(0, Math.min(weight, EXERCISE_SET_LIMITS.WEIGHT_MAX));
  }

  /**
   * Format weight value for display
   * Shows up to 1 decimal place, removes unnecessary .0
   */
  protected get formattedWeight(): string {
    const weight = this.validatedWeight;
    return weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
  }

  /**
   * Check if reps value is valid
   */
  protected isValidReps(): boolean {
    const reps = this.set?.reps || 0;
    return (
      reps >= EXERCISE_SET_LIMITS.REPS_MIN &&
      reps <= EXERCISE_SET_LIMITS.REPS_MAX
    );
  }

  /**
   * Check if weight value is valid
   */
  protected isValidWeight(): boolean {
    const weight = this.set?.weight || 0;
    return (
      weight >= EXERCISE_SET_LIMITS.WEIGHT_MIN &&
      weight <= EXERCISE_SET_LIMITS.WEIGHT_MAX
    );
  }

  /**
   * Check if the entire set is valid
   */
  protected isValidSet(): boolean {
    return (
      this.isValidReps() && this.isValidWeight() && !!this.set?.exercises?.name
    );
  }

  /**
   * Get appropriate label for reps count
   * Polish language has different forms for different numbers
   */
  protected getRepsLabel(reps: number): string {
    if (reps === 1) return "powtórzenie";
    if (reps >= 2 && reps <= 4) return "powtórzenia";
    return "powtórzeń";
  }

  /**
   * Handle edit button click
   */
  protected handleEdit(): void {
    if (this.set?.id && !this.disabled && !this.isDeleting) {
      this.editSet.emit(this.set.id);
    }
  }

  /**
   * Handle delete button click
   */
  protected handleDelete(): void {
    if (this.set?.id && !this.disabled && !this.isDeleting) {
      this.deleteSet.emit(this.set.id);
    }
  }

  /**
   * Get aria-label for edit button
   */
  protected getEditAriaLabel(): string {
    const exerciseName = this.set?.exercises?.name || "nieznane ćwiczenie";
    const reps = this.validatedReps;
    const weight = this.formattedWeight;
    return `Edytuj serię: ${exerciseName}, ${reps} ${this.getRepsLabel(reps)}, ${weight} kg`;
  }

  /**
   * Get aria-label for delete button
   */
  protected getDeleteAriaLabel(): string {
    const exerciseName = this.set?.exercises?.name || "nieznane ćwiczenie";
    const reps = this.validatedReps;
    const weight = this.formattedWeight;
    return `Usuń serię: ${exerciseName}, ${reps} ${this.getRepsLabel(reps)}, ${weight} kg`;
  }

  /**
   * Get set summary for accessibility
   */
  protected getSetSummary(): string {
    const exerciseName = this.set?.exercises?.name || "Nieznane ćwiczenie";
    const reps = this.validatedReps;
    const weight = this.formattedWeight;
    return `${exerciseName}: ${reps} ${this.getRepsLabel(reps)}, ${weight} kg`;
  }

  /**
   * Check if set has minimum required data
   */
  protected get hasMinimumData(): boolean {
    return !!(
      this.set?.id &&
      this.set?.exercises?.name &&
      this.set?.reps &&
      this.set?.weight
    );
  }

  /**
   * Get validation warnings for display
   */
  protected getValidationWarnings(): string[] {
    const warnings: string[] = [];

    if (!this.isValidReps()) {
      warnings.push(
        `Powtórzenia poza zakresem (${EXERCISE_SET_LIMITS.REPS_MIN}-${EXERCISE_SET_LIMITS.REPS_MAX})`,
      );
    }

    if (!this.isValidWeight()) {
      warnings.push(
        `Ciężar poza zakresem (${EXERCISE_SET_LIMITS.WEIGHT_MIN}-${EXERCISE_SET_LIMITS.WEIGHT_MAX} kg)`,
      );
    }

    if (!this.set?.exercises?.name) {
      warnings.push("Brak nazwy ćwiczenia");
    }

    return warnings;
  }

  /**
   * Get specific validation message for reps
   */
  protected getRepsValidationMessage(): string {
    const reps = this.set?.reps || 0;
    if (reps < EXERCISE_SET_LIMITS.REPS_MIN) {
      return `Minimalna liczba powtórzeń: ${EXERCISE_SET_LIMITS.REPS_MIN}`;
    }
    if (reps > EXERCISE_SET_LIMITS.REPS_MAX) {
      return `Maksymalna liczba powtórzeń: ${EXERCISE_SET_LIMITS.REPS_MAX}`;
    }
    return "Nieprawidłowa liczba powtórzeń";
  }

  /**
   * Get specific validation message for weight
   */
  protected getWeightValidationMessage(): string {
    const weight = this.set?.weight || 0;
    if (weight < EXERCISE_SET_LIMITS.WEIGHT_MIN) {
      return `Minimalny ciężar: ${EXERCISE_SET_LIMITS.WEIGHT_MIN} kg`;
    }
    if (weight > EXERCISE_SET_LIMITS.WEIGHT_MAX) {
      return `Maksymalny ciężar: ${EXERCISE_SET_LIMITS.WEIGHT_MAX} kg`;
    }
    return "Nieprawidłowy ciężar";
  }
}
