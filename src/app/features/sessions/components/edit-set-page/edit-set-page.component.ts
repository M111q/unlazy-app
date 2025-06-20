import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatSnackBar } from "@angular/material/snack-bar";

import { MaterialModule } from "../../../../shared/material.module";
import { DbService } from "../../../../data/db.service";
import {
  UpdateExerciseSetDto,
  Session,
  ExerciseSetWithExercise,
} from "../../../../../types";
import { EXERCISE_SET_LIMITS, ERROR_MESSAGES } from "../../../../constants";

interface EditSetPageState {
  sessionId: number | null;
  setId: number | null;
  session: Session | null;
  exerciseSet: ExerciseSetWithExercise | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

@Component({
  selector: "app-edit-set-page",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="edit-set-page">
      <div class="page-header">
        <button
          mat-icon-button
          (click)="navigateBack()"
          [disabled]="isSubmitting()"
          aria-label="Wróć do szczegółów sesji"
        >
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Edytuj serię</h1>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Ładowanie danych serii...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="!isLoading() && error()" class="error-container">
        <mat-icon class="error-icon">error</mat-icon>
        <h2>Wystąpił błąd</h2>
        <p>{{ error() }}</p>
        <button mat-raised-button color="primary" (click)="loadData()">
          <mat-icon>refresh</mat-icon>
          Spróbuj ponownie
        </button>
      </div>

      <!-- Form -->
      <div
        *ngIf="!isLoading() && !error() && exerciseSetInfo()"
        class="form-container"
      >
        <mat-card>
          <mat-card-header>
            <mat-card-title>Edycja serii ćwiczeń</mat-card-title>
            <mat-card-subtitle *ngIf="sessionInfo() && exerciseSetInfo()">
              {{ exerciseSetInfo()!.exercises.name }} • Sesja z
              {{ formatSessionDate(sessionInfo()!.session_datetime) }}
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="setForm" (ngSubmit)="onSubmit()">
              <!-- Exercise Info (Read-only) -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Ćwiczenie</mat-label>
                <input
                  matInput
                  [value]="exerciseSetInfo()?.exercises?.name || ''"
                  readonly
                  disabled
                />
                <mat-hint>Ćwiczenie nie może być zmienione</mat-hint>
              </mat-form-field>

              <!-- Weight Input -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Ciężar (kg)</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="weight"
                  [disabled]="isSubmitting()"
                  min="0"
                  max="{{ exerciseSetLimits.WEIGHT_MAX }}"
                  step="0.5"
                  placeholder="0.0"
                  required
                />
                <mat-hint>
                  Maksymalnie {{ exerciseSetLimits.WEIGHT_MAX }} kg
                </mat-hint>
                <mat-error *ngIf="setForm.get('weight')?.hasError('required')">
                  Podaj ciężar
                </mat-error>
                <mat-error *ngIf="setForm.get('weight')?.hasError('min')">
                  Ciężar musi być większy od 0
                </mat-error>
                <mat-error *ngIf="setForm.get('weight')?.hasError('max')">
                  Ciężar nie może przekraczać
                  {{ exerciseSetLimits.WEIGHT_MAX }} kg
                </mat-error>
              </mat-form-field>

              <!-- Reps Input -->
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Liczba powtórzeń</mat-label>
                <input
                  matInput
                  type="number"
                  formControlName="reps"
                  [disabled]="isSubmitting()"
                  min="1"
                  max="{{ exerciseSetLimits.REPS_MAX }}"
                  placeholder="1"
                  required
                />
                <mat-hint>
                  Maksymalnie {{ exerciseSetLimits.REPS_MAX }} powtórzeń
                </mat-hint>
                <mat-error *ngIf="setForm.get('reps')?.hasError('required')">
                  Podaj liczbę powtórzeń
                </mat-error>
                <mat-error *ngIf="setForm.get('reps')?.hasError('min')">
                  Minimalna liczba powtórzeń to 1
                </mat-error>
                <mat-error *ngIf="setForm.get('reps')?.hasError('max')">
                  Maksymalna liczba powtórzeń to
                  {{ exerciseSetLimits.REPS_MAX }}
                </mat-error>
              </mat-form-field>
            </form>
          </mat-card-content>

          <mat-card-actions align="end">
            <button
              mat-button
              type="button"
              (click)="navigateBack()"
              [disabled]="isSubmitting()"
            >
              Anuluj
            </button>
            <button
              mat-raised-button
              color="primary"
              type="submit"
              (click)="onSubmit()"
              [disabled]="
                setForm.invalid || isSubmitting() || !hasFormChanged()
              "
            >
              <mat-spinner
                *ngIf="isSubmitting()"
                diameter="20"
                class="button-spinner"
              ></mat-spinner>
              <mat-icon *ngIf="!isSubmitting()">save</mat-icon>
              {{ isSubmitting() ? "Zapisywanie..." : "Zapisz zmiany" }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styleUrls: ["./edit-set-page.component.scss"],
})
export class EditSetPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dbService = inject(DbService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  // Store initial form values for comparison
  private initialFormValues: { weight: number; reps: number } | null = null;

  // Form
  readonly setForm: FormGroup = this.formBuilder.group({
    weight: [
      null,
      [
        Validators.required,
        Validators.min(EXERCISE_SET_LIMITS.WEIGHT_MIN),
        Validators.max(EXERCISE_SET_LIMITS.WEIGHT_MAX),
      ],
    ],
    reps: [
      null,
      [
        Validators.required,
        Validators.min(EXERCISE_SET_LIMITS.REPS_MIN),
        Validators.max(EXERCISE_SET_LIMITS.REPS_MAX),
      ],
    ],
  });

  // State
  protected readonly state = signal<EditSetPageState>({
    sessionId: null,
    setId: null,
    session: null,
    exerciseSet: null,
    isLoading: true,
    isSubmitting: false,
    error: null,
  });

  // Computed values
  protected readonly sessionInfo = computed(() => this.state().session);
  protected readonly exerciseSetInfo = computed(() => this.state().exerciseSet);
  protected readonly isLoading = computed(() => this.state().isLoading);
  protected readonly isSubmitting = computed(() => this.state().isSubmitting);
  protected readonly error = computed(() => this.state().error);

  // Constants for template
  readonly exerciseSetLimits = EXERCISE_SET_LIMITS;

  ngOnInit(): void {
    this.initializeComponent();
  }

  private initializeComponent(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const sessionId = Number(params["id"]);
        const setId = Number(params["setId"]);

        if (isNaN(sessionId) || sessionId <= 0 || isNaN(setId) || setId <= 0) {
          this.handleInvalidParameters();
          return;
        }

        this.state.update((state) => ({
          ...state,
          sessionId,
          setId,
        }));

        this.loadData();
      });
  }

  private handleInvalidParameters(): void {
    this.state.update((state) => ({
      ...state,
      error: "Nieprawidłowe parametry w adresie URL",
      isLoading: false,
    }));
  }

  protected async loadData(): Promise<void> {
    const { sessionId, setId } = this.state();
    if (!sessionId || !setId) return;

    this.state.update((state) => ({
      ...state,
      error: null,
      isLoading: true,
    }));

    try {
      // Load session details first
      const session = await this.dbService.getSessionById(sessionId);

      // Load all sets for the session to find the specific set
      const sessionSets = await this.dbService.getSessionSets(sessionId, {
        page: 1,
        limit: 1000, // Get all sets to find the one we need
      });

      const exerciseSet = sessionSets.find((set) => set.id === setId);

      if (!exerciseSet) {
        throw new Error("Seria ćwiczeń nie została znaleziona");
      }

      // Populate form with current values
      this.setForm.patchValue({
        weight: exerciseSet.weight,
        reps: exerciseSet.reps,
      });

      // Store initial values for comparison
      this.initialFormValues = {
        weight: exerciseSet.weight,
        reps: exerciseSet.reps,
      };

      this.state.update((state) => ({
        ...state,
        session,
        exerciseSet,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading data:", error);
      this.state.update((state) => ({
        ...state,
        error: this.getErrorMessage(error),
        isLoading: false,
      }));
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.setForm.invalid || this.isSubmitting() || !this.hasFormChanged()) {
      return;
    }

    const setId = this.state().setId;
    if (!setId) {
      this.showErrorMessage("Błąd: Brak identyfikatora serii");
      return;
    }

    this.state.update((state) => ({ ...state, isSubmitting: true }));

    try {
      const formValue = this.setForm.value;
      const updateSetDto: UpdateExerciseSetDto = {
        weight: parseFloat(formValue.weight),
        reps: parseInt(formValue.reps, 10),
      };

      await this.dbService.updateExerciseSet(setId, updateSetDto);

      this.showSuccessMessage("Seria została zaktualizowana pomyślnie");
      this.navigateBack();
    } catch (error) {
      console.error("Error updating exercise set:", error);
      this.showErrorMessage(this.getErrorMessage(error));
    } finally {
      this.state.update((state) => ({ ...state, isSubmitting: false }));
    }
  }

  protected hasFormChanged(): boolean {
    if (!this.initialFormValues) return false;

    const currentValues = this.setForm.value;
    return (
      parseFloat(currentValues.weight) !== this.initialFormValues.weight ||
      parseInt(currentValues.reps, 10) !== this.initialFormValues.reps
    );
  }

  protected navigateBack(): void {
    const sessionId = this.state().sessionId;
    if (sessionId) {
      this.router.navigate(["/sessions", sessionId]);
    } else {
      this.router.navigate(["/sessions"]);
    }
  }

  protected formatSessionDate(datetime: string): string {
    try {
      const date = new Date(datetime);
      return date.toLocaleDateString("pl-PL", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return datetime;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return ERROR_MESSAGES.UNEXPECTED_ERROR;
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, "Zamknij", {
      duration: 5000,
      panelClass: ["success-snackbar"],
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, "Zamknij", {
      duration: 7000,
      panelClass: ["error-snackbar"],
    });
  }
}
