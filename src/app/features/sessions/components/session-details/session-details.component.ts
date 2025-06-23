import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
  DestroyRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterModule } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";

import { MaterialModule } from "../../../../shared/material.module";
import { DbService } from "../../../../data/db.service";
import { PAGINATION, SESSION_LIMITS } from "../../../../constants";
import {
  SessionWithStats,
  ExerciseSetWithExercise,
  ApiError,
  PaginationOptions,
} from "../../../../../types";
import { PageHeaderComponent } from "../page-header/page-header.component";
import { SessionDetailsCardComponent } from "../session-details-card/session-details-card.component";
import { StatsCardComponent } from "../stats-card/stats-card.component";
import { SessionSetsListComponent } from "../session-sets-list/session-sets-list.component";
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
  ConfirmDialogResult,
} from "../confirm-dialog/confirm-dialog.component";

// Types specific to SessionDetails view
interface SessionDetailsState {
  sessionId: number;
  sessionDetails: SessionWithStats | null;
  sessionSets: ExerciseSetWithExercise[];
  isLoading: boolean;
  isLoadingSets: boolean;
  isDeletingSet: boolean;
  deletingSetId: number | null;
  isChangingPage: boolean;
  error: ApiError | null;
  currentPage: number;
  totalSetsCount: number;
  itemsPerPage: number;
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

@Component({
  selector: "app-session-details",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    PageHeaderComponent,
    SessionDetailsCardComponent,
    StatsCardComponent,
    SessionSetsListComponent,
  ],
  template: `
    <div
      class="max-w-screen-xl mx-auto p-lg mobile-p-md"
      style="min-height: calc(100vh - 64px);"
    >
      <!-- Loading State -->
      <div *ngIf="isMainLoading()" class="loading-state">
        <mat-spinner diameter="40"></mat-spinner>
        <p class="text-secondary text-sm m-0">Ładowanie szczegółów sesji...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="state().error && !isMainLoading()" class="error-state">
        <mat-card class="shadow border rounded-lg bg-white max-w-md mx-auto">
          <mat-card-content class="p-lg">
            <div class="d-flex flex-column align-center text-center gap-md">
              <mat-icon
                class="text-6xl text-error"
                [class]="getErrorIconClass()"
                >{{ getErrorIcon() }}</mat-icon
              >
              <h3 class="text-lg font-medium text-primary m-0">
                {{ getErrorTitle() }}
              </h3>
              <p class="text-secondary text-sm m-0">
                {{ state().error?.message }}
              </p>
              <div class="w-full" *ngIf="shouldShowErrorDetails()">
                <details class="bg-subtle border-subtle rounded p-sm mt-xs">
                  <summary
                    class="cursor-pointer font-medium text-secondary text-sm hover:text-primary focus-visible"
                  >
                    Szczegóły techniczne
                  </summary>
                  <p class="m-xs text-xs text-left leading-normal">
                    <strong>Kod błędu:</strong> {{ state().error?.code }}
                  </p>
                  <p class="m-xs text-xs text-left leading-normal">
                    <strong>Identyfikator sesji:</strong>
                    {{ state().sessionId }}
                  </p>
                  <p class="m-xs text-xs text-left leading-normal">
                    <strong>Czas wystąpienia:</strong>
                    {{ getCurrentTimestamp() }}
                  </p>
                </details>
              </div>
              <div class="d-flex flex-column gap-xs w-full max-w-xs">
                <button
                  *ngIf="canRetryOperation()"
                  mat-raised-button
                  (click)="handleRetryAction()"
                  [disabled]="state().isLoading"
                  class="btn-primary d-flex align-center gap-xs"
                >
                  <mat-icon class="text-lg">refresh</mat-icon>
                  {{ getRetryButtonText() }}
                </button>
                <button
                  *ngIf="shouldShowNavigateHome()"
                  mat-button
                  (click)="navigateToSessions()"
                  class="btn-secondary d-flex align-center gap-xs"
                >
                  <mat-icon class="text-lg">home</mat-icon>
                  Powrót do listy sesji
                </button>
                <button
                  *ngIf="shouldShowContactSupport()"
                  mat-button
                  (click)="copyErrorInfo()"
                  class="btn-secondary d-flex align-center gap-xs"
                >
                  <mat-icon class="text-lg">content_copy</mat-icon>
                  Skopiuj informacje o błędzie
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Success State -->
      <div
        *ngIf="state().sessionDetails && !state().error"
        class="d-flex flex-column gap-lg"
      >
        <!-- Page Header -->
        <app-page-header
          [title]="
            'Szczegóły treningu ' +
            formatSessionDate(state().sessionDetails?.session_datetime)
          "
          [sessionId]="state().sessionId"
          [sessionDate]="state().sessionDetails?.session_datetime || ''"
          [disabled]="isMainLoading() || isAnyOperationInProgress()"
          [isSetLimitReached]="isSetLimitReached()"
          (onBackToSessions)="navigateToSessions()"
          (onEditSession)="navigateToEditSession()"
          (onAddSet)="navigateToAddSet()"
        ></app-page-header>

        <!-- Session Details Card -->
        <app-session-details-card
          [session]="state().sessionDetails!"
        ></app-session-details-card>

        <!-- Stats Card -->
        <app-stats-card
          [totalWeight]="state().sessionDetails?.total_weight || 0"
          [totalReps]="state().sessionDetails?.total_reps || 0"
          [exerciseCount]="exerciseCount()"
        ></app-stats-card>

        <!-- Sets List -->
        <app-session-sets-list
          [sets]="state().sessionSets"
          [loading]="state().isLoadingSets || state().isChangingPage"
          [totalCount]="state().totalSetsCount"
          [currentPage]="state().currentPage"
          [itemsPerPage]="state().itemsPerPage"
          [deletingSetId]="state().deletingSetId"
          [disabled]="isAnyOperationInProgress()"
          (onPageChange)="onPageChange($event)"
          (onEditSet)="navigateToEditSet($event)"
          (onDeleteSet)="confirmDeleteSet($event)"
          (onAddSet)="navigateToAddSet()"
        ></app-session-sets-list>
      </div>
    </div>
  `,
  styleUrls: ["./session-details.component.scss"],
})
export class SessionDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dbService = inject(DbService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // State management with signals
  protected readonly state = signal<SessionDetailsState>({
    sessionId: 0,
    sessionDetails: null,
    sessionSets: [],
    isLoading: false,
    isLoadingSets: false,
    isDeletingSet: false,
    deletingSetId: null,
    isChangingPage: false,
    error: null,
    currentPage: 1,
    totalSetsCount: 0,
    itemsPerPage: PAGINATION.DEFAULT_SETS_LIMIT,
  });

  // Computed values
  protected readonly isMainLoading = computed(
    () =>
      this.state().isLoading ||
      (!this.state().sessionDetails && !this.state().error),
  );

  protected readonly exerciseCount = computed(() => {
    const sets = this.state().sessionSets;
    const uniqueExercises = new Set(sets.map((set) => set.exercise_id));
    return uniqueExercises.size;
  });

  protected readonly paginationState = computed((): PaginationState => {
    const { currentPage, totalSetsCount, itemsPerPage } = this.state();
    const totalPages = Math.ceil(totalSetsCount / itemsPerPage);

    return {
      currentPage,
      totalPages,
      totalItems: totalSetsCount,
      itemsPerPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  });

  protected readonly isSetLimitReached = computed(
    () => this.state().totalSetsCount >= SESSION_LIMITS.MAX_SETS_PER_SESSION,
  );

  protected readonly isAnyOperationInProgress = computed(
    () =>
      this.state().isDeletingSet ||
      this.state().isChangingPage ||
      this.state().isLoading,
  );

  ngOnInit(): void {
    this.initializeComponent();
  }

  private initializeComponent(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const sessionId = Number(params["id"]);

        if (!sessionId || sessionId <= 0) {
          this.handleInvalidSessionId();
          return;
        }

        this.state.update((state) => ({
          ...state,
          sessionId,
          error: null,
        }));

        this.loadSessionData();
      });
  }

  private handleInvalidSessionId(): void {
    this.state.update((state) => ({
      ...state,
      error: {
        message: "Nieprawidłowy identyfikator sesji",
        code: "INVALID_SESSION_ID",
      },
    }));
  }

  protected loadSessionData(): void {
    const sessionId = this.state().sessionId;
    if (!sessionId) return;

    this.state.update((state) => ({
      ...state,
      isLoading: true,
      error: null,
    }));

    this.loadSessionDataAsync(sessionId);
  }

  private async loadSessionDataAsync(sessionId: number): Promise<void> {
    try {
      const [sessionDetails, setsData] = await Promise.all([
        this.dbService.getSessionById(sessionId),
        this.loadSessionSetsAsync(sessionId, 1),
      ]);

      if (!sessionDetails) {
        this.state.update((state) => ({
          ...state,
          error: {
            message: "Sesja nie została znaleziona",
            code: "SESSION_NOT_FOUND",
          },
          isLoading: false,
        }));
        return;
      }

      this.state.update((state) => ({
        ...state,
        sessionDetails,
        sessionSets: setsData.sets,
        totalSetsCount: setsData.totalCount,
        currentPage: 1,
        error: null,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error loading session data:", error);
      this.state.update((state) => ({
        ...state,
        error: this.transformError(error),
        isLoading: false,
      }));
    }
  }

  private async loadSessionSetsAsync(
    sessionId: number,
    page: number,
  ): Promise<{ sets: ExerciseSetWithExercise[]; totalCount: number }> {
    try {
      const options: PaginationOptions = {
        page: page - 1, // Convert to 0-based for API
        limit: this.state().itemsPerPage,
      };

      const sets = await this.dbService.getSessionSets(sessionId, options);

      // For now, we'll get all sets to calculate total count
      // In a real app, the API should return paginated results with total count
      const allSetsOptions: PaginationOptions = { page: 0, limit: 1000 };
      const allSets = await this.dbService.getSessionSets(
        sessionId,
        allSetsOptions,
      );

      return {
        sets,
        totalCount: allSets?.length || 0,
      };
    } catch (error) {
      console.error("Error loading session sets:", error);
      this.handleSetLoadingError(error);
      return { sets: [], totalCount: 0 };
    }
  }

  protected onPageChange(page: number): void {
    if (page === this.state().currentPage || this.isAnyOperationInProgress())
      return;

    this.state.update((state) => ({
      ...state,
      isChangingPage: true,
      currentPage: page,
    }));

    this.loadSessionSetsForPage(page);
  }

  private async loadSessionSetsForPage(page: number): Promise<void> {
    try {
      const setsData = await this.loadSessionSetsAsync(
        this.state().sessionId,
        page,
      );
      this.state.update((state) => ({
        ...state,
        sessionSets: setsData.sets,
        isChangingPage: false,
      }));
    } catch (error) {
      console.error("Error loading session sets for page:", error);
      this.state.update((state) => ({
        ...state,
        isChangingPage: false,
      }));
    }
  }

  protected navigateToSessions(): void {
    this.router.navigate(["/sessions"]);
  }

  protected navigateToEditSession(): void {
    const sessionId = this.state().sessionId;
    this.router.navigate(["/sessions"], {
      queryParams: { edit: sessionId },
    });
  }

  protected navigateToAddSet(): void {
    const sessionId = this.state().sessionId;
    this.router.navigate(["/sessions", sessionId, "sets", "new"]);
  }

  protected navigateToEditSet(setId: number): void {
    const sessionId = this.state().sessionId;
    this.router.navigate(["/sessions", sessionId, "sets", setId, "edit"]);
  }

  protected confirmDeleteSet(setId: number): void {
    // Prevent multiple delete operations
    if (this.state().isDeletingSet) return;

    // Find the set to get exercise name for confirmation message
    const setToDelete = this.state().sessionSets.find(
      (set) => set.id === setId,
    );
    const exerciseName = setToDelete?.exercises?.name || "nieznane ćwiczenie";

    const dialogData: ConfirmDialogData = {
      title: "Potwierdzenie usunięcia",
      message: `Czy na pewno chcesz usunąć serię "${exerciseName}"? Ta operacja jest nieodwracalna.`,
      confirmText: "Usuń",
      cancelText: "Anuluj",
      isDestructive: true,
    };

    const dialogRef = this.dialog.open<
      ConfirmDialogComponent,
      ConfirmDialogData,
      ConfirmDialogResult
    >(ConfirmDialogComponent, {
      data: dialogData,
      width: "400px",
      maxWidth: "90vw",
      disableClose: false,
      hasBackdrop: true,
      backdropClass: "confirm-dialog-backdrop",
      panelClass: "confirm-dialog-panel",
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmed) {
        this.deleteSet(setId);
      }
    });
  }

  private async deleteSet(setId: number): Promise<void> {
    this.state.update((state) => ({
      ...state,
      isDeletingSet: true,
      deletingSetId: setId,
      error: null,
    }));

    try {
      await this.dbService.deleteExerciseSet(setId);

      // Refresh session data to get updated statistics
      await this.refreshSessionData();

      // Show success notification
      this.showSuccessMessage("Seria została pomyślnie usunięta");
    } catch (error) {
      console.error("Error deleting set:", error);
      this.showErrorMessage("Nie udało się usunąć serii. Spróbuj ponownie.");
      this.state.update((state) => ({
        ...state,
        error: this.transformError(error),
        isDeletingSet: false,
        deletingSetId: null,
      }));
    }
  }

  private async refreshSessionData(): Promise<void> {
    const sessionId = this.state().sessionId;
    const currentPage = this.state().currentPage;

    try {
      // Reload both session details and sets
      const [sessionDetails, setsData] = await Promise.all([
        this.dbService.getSessionById(sessionId),
        this.loadSessionSetsAsync(sessionId, currentPage),
      ]);

      // If current page is empty and we're not on page 1, go to previous page
      const shouldGoToPreviousPage =
        setsData.sets.length === 0 && currentPage > 1;
      const newPage = shouldGoToPreviousPage ? currentPage - 1 : currentPage;

      let finalSetsData = setsData;
      if (shouldGoToPreviousPage) {
        finalSetsData = await this.loadSessionSetsAsync(sessionId, newPage);
      }

      this.state.update((state) => ({
        ...state,
        sessionDetails,
        sessionSets: finalSetsData.sets,
        totalSetsCount: finalSetsData.totalCount,
        currentPage: newPage,
        isDeletingSet: false,
        deletingSetId: null,
        error: null,
      }));
    } catch (error) {
      console.error("Error refreshing session data:", error);
      this.state.update((state) => ({
        ...state,
        error: this.transformError(error),
        isDeletingSet: false,
        deletingSetId: null,
      }));
    }
  }

  protected formatSessionDate(datetime: string | undefined): string {
    if (!datetime) return "";
    return new Date(datetime).toLocaleDateString("pl-PL");
  }

  protected formatSessionDateTime(datetime: string | undefined): string {
    if (!datetime) return "";
    return new Date(datetime).toLocaleString("pl-PL");
  }

  private handleSetLoadingError(error: any): void {
    console.error("Failed to load session sets:", error);
    // In a real app, you might want to show a toast notification or update state
  }

  private transformError(error: unknown): ApiError {
    const err = error as any;
    // Network errors
    if (err?.name === "NetworkError" || err?.code === "NETWORK_ERROR") {
      return {
        message:
          "Brak połączenia z internetem. Sprawdź połączenie sieciowe i spróbuj ponownie.",
        code: "NETWORK_ERROR",
      };
    }

    // Session-specific errors
    if (
      err?.code === "SESSION_NOT_FOUND" ||
      err?.message?.includes("Session not found")
    ) {
      return {
        message:
          "Sesja treningowa nie została znaleziona. Może została usunięta lub nie masz do niej dostępu.",
        code: "SESSION_NOT_FOUND",
      };
    }

    // Authorization errors
    if (err?.code === "UNAUTHORIZED" || err?.status === 401) {
      return {
        message:
          "Brak uprawnień do przeglądania tej sesji. Zaloguj się ponownie lub skontaktuj się z administratorem.",
        code: "UNAUTHORIZED",
      };
    }

    // Forbidden access
    if (err?.code === "FORBIDDEN" || err?.status === 403) {
      return {
        message:
          "Nie masz uprawnień do tej sesji. Ta sesja należy do innego użytkownika.",
        code: "FORBIDDEN",
      };
    }

    // Server errors
    if (err?.status >= 500 || err?.code === "INTERNAL_SERVER_ERROR") {
      return {
        message:
          "Wystąpił błąd serwera. Spróbuj ponownie za chwilę lub skontaktuj się z pomocą techniczną.",
        code: "SERVER_ERROR",
      };
    }

    // Validation errors
    if (err?.code === "VALIDATION_ERROR") {
      return {
        message:
          "Dane sesji są nieprawidłowe. Sprawdź poprawność wprowadzonych informacji.",
        code: "VALIDATION_ERROR",
      };
    }

    // Rate limiting
    if (err?.status === 429 || err?.code === "RATE_LIMIT_EXCEEDED") {
      return {
        message: "Zbyt wiele żądań. Poczekaj chwilę przed kolejną próbą.",
        code: "RATE_LIMIT_EXCEEDED",
      };
    }

    // Database errors
    if (err?.code === "DATABASE_ERROR") {
      return {
        message:
          "Wystąpił błąd bazy danych. Spróbuj ponownie lub skontaktuj się z pomocą techniczną.",
        code: "DATABASE_ERROR",
      };
    }

    // Timeout errors
    if (err?.name === "TimeoutError" || err?.code === "TIMEOUT") {
      return {
        message:
          "Operacja trwała zbyt długo. Sprawdź połączenie internetowe i spróbuj ponownie.",
        code: "TIMEOUT",
      };
    }

    // Default error handling
    return {
      message:
        err?.message ||
        "Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub skontaktuj się z pomocą techniczną.",
      code: err?.code || "UNKNOWN_ERROR",
    };
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, "Zamknij", {
      duration: 4000,
      horizontalPosition: "center",
      verticalPosition: "bottom",
      panelClass: ["success-snackbar"],
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, "Zamknij", {
      duration: 6000,
      horizontalPosition: "center",
      verticalPosition: "bottom",
      panelClass: ["error-snackbar"],
    });
  }

  // Enhanced error handling methods
  protected getErrorIcon(): string {
    const errorCode = this.state().error?.code;
    switch (errorCode) {
      case "NETWORK_ERROR":
        return "wifi_off";
      case "SESSION_NOT_FOUND":
        return "search_off";
      case "UNAUTHORIZED":
      case "FORBIDDEN":
        return "lock";
      case "SERVER_ERROR":
      case "DATABASE_ERROR":
        return "dns";
      case "RATE_LIMIT_EXCEEDED":
        return "schedule";
      case "TIMEOUT":
        return "timer_off";
      default:
        return "error";
    }
  }

  protected getErrorIconClass(): string {
    const errorCode = this.state().error?.code;
    switch (errorCode) {
      case "NETWORK_ERROR":
      case "TIMEOUT":
        return "network-error-icon";
      case "UNAUTHORIZED":
      case "FORBIDDEN":
        return "auth-error-icon";
      case "SERVER_ERROR":
      case "DATABASE_ERROR":
        return "server-error-icon";
      default:
        return "error-icon";
    }
  }

  protected getErrorTitle(): string {
    const errorCode = this.state().error?.code;
    switch (errorCode) {
      case "NETWORK_ERROR":
        return "Brak połączenia";
      case "SESSION_NOT_FOUND":
        return "Sesja nie znaleziona";
      case "UNAUTHORIZED":
        return "Brak autoryzacji";
      case "FORBIDDEN":
        return "Brak dostępu";
      case "SERVER_ERROR":
      case "DATABASE_ERROR":
        return "Błąd serwera";
      case "RATE_LIMIT_EXCEEDED":
        return "Zbyt wiele żądań";
      case "TIMEOUT":
        return "Przekroczono limit czasu";
      case "VALIDATION_ERROR":
        return "Błąd walidacji";
      default:
        return "Wystąpił błąd";
    }
  }

  protected shouldShowErrorDetails(): boolean {
    return this.state().error?.code !== "SESSION_NOT_FOUND";
  }

  protected canRetryOperation(): boolean {
    const errorCode = this.state().error?.code;
    return !["SESSION_NOT_FOUND", "FORBIDDEN", "UNAUTHORIZED"].includes(
      errorCode || "",
    );
  }

  protected shouldShowNavigateHome(): boolean {
    return true; // Always show option to go back to sessions list
  }

  protected shouldShowContactSupport(): boolean {
    const errorCode = this.state().error?.code;
    return ["SERVER_ERROR", "DATABASE_ERROR", "UNKNOWN_ERROR"].includes(
      errorCode || "",
    );
  }

  protected getRetryButtonText(): string {
    const errorCode = this.state().error?.code;
    switch (errorCode) {
      case "NETWORK_ERROR":
        return "Sprawdź połączenie";
      case "TIMEOUT":
        return "Spróbuj ponownie";
      case "RATE_LIMIT_EXCEEDED":
        return "Odczekaj i spróbuj";
      default:
        return "Spróbuj ponownie";
    }
  }

  protected handleRetryAction(): void {
    const errorCode = this.state().error?.code;

    switch (errorCode) {
      case "NETWORK_ERROR":
      case "TIMEOUT":
        // For network errors, try to reload all data
        this.loadSessionData();
        break;
      case "RATE_LIMIT_EXCEEDED":
        // For rate limiting, wait a bit before retrying
        setTimeout(() => this.loadSessionData(), 2000);
        break;
      default:
        // Default retry behavior
        this.loadSessionData();
        break;
    }
  }

  protected getCurrentTimestamp(): string {
    return new Date().toLocaleString("pl-PL");
  }

  protected copyErrorInfo(): void {
    const errorInfo = {
      code: this.state().error?.code,
      message: this.state().error?.message,
      sessionId: this.state().sessionId,
      timestamp: this.getCurrentTimestamp(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const errorText = `Informacje o błędzie:
Kod: ${errorInfo.code}
Komunikat: ${errorInfo.message}
ID sesji: ${errorInfo.sessionId}
Czas: ${errorInfo.timestamp}
URL: ${errorInfo.url}
Przeglądarka: ${errorInfo.userAgent}`;

    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(errorText)
        .then(() => {
          this.showSuccessMessage(
            "Informacje o błędzie zostały skopiowane do schowka",
          );
        })
        .catch(() => {
          this.showErrorMessage("Nie udało się skopiować informacji o błędzie");
        });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = errorText;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        this.showSuccessMessage(
          "Informacje o błędzie zostały skopiowane do schowka",
        );
      } catch {
        this.showErrorMessage("Nie udało się skopiować informacji o błędzie");
      }
      document.body.removeChild(textArea);
    }
  }
}
