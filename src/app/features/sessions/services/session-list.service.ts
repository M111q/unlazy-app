import { Injectable, computed, inject, signal } from "@angular/core";
import { Observable } from "rxjs";

import { DbService } from "../../../data/db.service";
import {
  ApiError,
  CreateSessionDto,
  PaginationOptions,
  Session,
  SessionWithStats,
  UpdateSessionDto,
} from "../../../../types";
import {
  PaginationViewModel,
  SessionItemViewModel,
  SessionListViewModel,
} from "../types/sessions-view-models";
import { PAGINATION, SESSION_LIMITS } from "../../../constants";

@Injectable({
  providedIn: "root",
})
export class SessionListService {
  private readonly dbService = inject(DbService);

  // State signals
  private readonly sessions = signal<SessionItemViewModel[]>([]);
  private readonly loading = signal<boolean>(false);
  private readonly error = signal<ApiError | null>(null);
  private readonly pagination = signal<PaginationViewModel>({
    currentPage: PAGINATION.DEFAULT_PAGE,
    pageSize: PAGINATION.DEFAULT_SESSIONS_LIMIT,
    totalItems: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  // Computed view model
  readonly viewModel = computed<SessionListViewModel>(() => ({
    sessions: this.sessions(),
    pagination: this.pagination(),
    loading: this.loading(),
    error: this.error(),
    canAddSession: this.computeCanAddSession(),
  }));

  /**
   * Load sessions for specified page
   * Updates loading, sessions, pagination, and error signals
   */
  loadSessions(page: number = PAGINATION.DEFAULT_PAGE): void {
    this.loading.set(true);
    this.error.set(null);

    const options: PaginationOptions = {
      page,
      limit: this.pagination().pageSize,
    };

    this.dbService
      .getSessions(options)
      .then((sessionsWithStats) => {
        const sessionViewModels = this.mapToViewModels(sessionsWithStats);
        this.sessions.set(sessionViewModels);
        this.updatePaginationState(page, sessionViewModels.length);
      })
      .catch((error) => {
        console.error("Failed to load sessions:", error);
        this.error.set({
          message: "Nie udało się załadować sesji. Spróbuj ponownie.",
          code: "LOAD_SESSIONS_ERROR",
        });
        this.sessions.set([]);
      })
      .finally(() => {
        this.loading.set(false);
      });
  }

  /**
   * Refresh current page
   */
  refreshCurrentPage(): void {
    this.loadSessions(this.pagination().currentPage);
  }

  /**
   * Add new session
   * Returns observable for component to handle success/error
   */
  addSession(session: CreateSessionDto): Observable<Session> {
    console.log(
      "SessionListService: Starting session creation process",
      session,
    );

    return new Observable((subscriber) => {
      this.dbService
        .createSession(session)
        .then((createdSession) => {
          console.log(
            "SessionListService: Session created successfully",
            createdSession,
          );
          // Refresh current page to show new session
          this.refreshCurrentPage();
          subscriber.next(createdSession);
          subscriber.complete();
        })
        .catch((error) => {
          console.error("SessionListService: Failed to create session:", error);
          console.error("SessionListService: Error details:", {
            message: error.message,
            code: error.code,
            stack: error.stack,
          });

          const apiError: ApiError = {
            message: "Nie udało się utworzyć sesji. Spróbuj ponownie.",
            code: "CREATE_SESSION_ERROR",
          };
          subscriber.error(apiError);
        });
    });
  }

  /**
   * Update existing session
   * Returns observable for component to handle success/error
   */
  updateSession(id: number, updates: UpdateSessionDto): Observable<Session> {
    return new Observable((subscriber) => {
      this.dbService
        .updateSession(id, updates)
        .then((updatedSession) => {
          // Refresh current page to show updated session
          this.refreshCurrentPage();
          subscriber.next(updatedSession);
          subscriber.complete();
        })
        .catch((error) => {
          console.error("Failed to update session:", error);
          const apiError: ApiError = {
            message: "Nie udało się zaktualizować sesji. Spróbuj ponownie.",
            code: "UPDATE_SESSION_ERROR",
          };
          subscriber.error(apiError);
        });
    });
  }

  /**
   * Delete session
   * Returns observable for component to handle success/error
   */
  deleteSession(id: number): Observable<void> {
    return new Observable((subscriber) => {
      this.dbService
        .deleteSession(id)
        .then(() => {
          // Refresh current page to remove deleted session
          this.refreshCurrentPage();
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => {
          console.error("Failed to delete session:", error);
          const apiError: ApiError = {
            message: "Nie udało się usunąć sesji. Spróbuj ponownie.",
            code: "DELETE_SESSION_ERROR",
          };
          subscriber.error(apiError);
        });
    });
  }

  /**
   * Map SessionWithStats to SessionItemViewModel
   */
  private mapToViewModels(
    sessionsWithStats: SessionWithStats[],
  ): SessionItemViewModel[] {
    return sessionsWithStats.map((session, index) => ({
      id: session.id,
      sessionDatetime: new Date(session.session_datetime),
      description: session.description,
      location: session.location,
      totalWeight: session.total_weight,
      totalReps: session.total_reps,
      exerciseCount: this.calculateExerciseCount(session.exercise_sets),
      formattedDate: this.formatDate(new Date(session.session_datetime)),
      formattedTime: this.formatTime(new Date(session.session_datetime)),
      isExpandedByDefault: index === 0, // First element expanded by default
    }));
  }

  /**
   * Calculate the number of unique exercises in a session
   */
  private calculateExerciseCount(
    exerciseSets: SessionWithStats["exercise_sets"],
  ): number {
    if (!exerciseSets || exerciseSets.length === 0) {
      return 0;
    }

    const uniqueExerciseIds = new Set<number>();
    exerciseSets.forEach((set) => {
      if (set.exercises?.id) {
        uniqueExerciseIds.add(set.exercises.id);
      }
    });

    return uniqueExerciseIds.size;
  }

  /**
   * Update pagination state based on loaded data
   */
  private updatePaginationState(
    currentPage: number,
    loadedCount: number,
  ): void {
    const currentPagination = this.pagination();

    this.pagination.set({
      ...currentPagination,
      currentPage,
      hasNextPage: loadedCount >= currentPagination.pageSize,
      hasPreviousPage: currentPage > 0,
      // Note: totalItems would need to be returned from API for accurate count
      totalItems: currentPagination.totalItems,
    });
  }

  /**
   * Compute if user can add new session (daily limit check)
   */
  private computeCanAddSession(): boolean {
    const todaySessions = this.sessions().filter((session) => {
      const sessionDate = new Date(session.sessionDatetime);
      const today = new Date();
      return sessionDate.toDateString() === today.toDateString();
    });

    return todaySessions.length < SESSION_LIMITS.MAX_DAILY_SESSIONS;
  }

  /**
   * Format date for display (DD.MM.YYYY)
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  /**
   * Format time for display (HH:MM)
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
