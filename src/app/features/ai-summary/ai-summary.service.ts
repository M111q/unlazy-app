import { Injectable, OnDestroy, inject } from "@angular/core";
import { Observable, Subject, throwError, timer } from "rxjs";
import { catchError, map, switchMap, takeUntil } from "rxjs/operators";

import { DbService } from "../../data/db.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  AISummaryState,
  GenerateSummaryRequest,
  GenerateSummaryAsyncResponse,
  SummaryGenerationStatus,
  Session,
  User,
} from "../../../types";
import { AI_SUMMARY, AI_MESSAGES } from "../../shared/constants/ai-constants";

@Injectable({
  providedIn: "root",
})
export class AISummaryService implements OnDestroy {
  private readonly dbService = inject(DbService);
  private readonly snackBar = inject(MatSnackBar);

  private pollingIntervals = new Map<number, ReturnType<typeof setInterval>>();
  private debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();

  private readonly destroy$ = new Subject<void>();

  /**
   * Generates AI summary for a training session
   * @param sessionId - ID of the session to summarize
   * @returns Observable with generation status updates
   */
  async generateSessionSummary(
    sessionId: number,
  ): Promise<Observable<AISummaryState>> {
    // Clear any existing debounce timer for this session
    this.clearDebounceTimer(sessionId);

    // Set up debounce timer to prevent rapid successive calls
    return new Promise((resolve) => {
      const debounceTimer = setTimeout(async () => {
        try {
          const canGenerate = await this.canGenerateSummary(sessionId);
          if (!canGenerate) {
            resolve(
              throwError(
                () => new Error("Cannot generate summary for this session"),
              ),
            );
            return;
          }

          resolve(this.executeGeneration(sessionId));
        } catch (error) {
          resolve(throwError(() => error));
        }
      }, AI_SUMMARY.DEBOUNCE_DELAY);

      this.debounceTimers.set(sessionId, debounceTimer);
    });
  }

  /**
   * Executes the actual generation process
   * @private
   */
  private executeGeneration(sessionId: number): Observable<AISummaryState> {
    const subject = new Subject<AISummaryState>();

    // Emit initial generating state
    subject.next({
      isGenerating: true,
      summary: null,
      canGenerate: false,
      error: null,
    });

    // Start the API call
    this.performAPICall(sessionId, subject);

    return subject.asObservable().pipe(takeUntil(this.destroy$));
  }

  /**
   * Performs the actual API call to generate summary
   * @private
   */
  private async performAPICall(
    sessionId: number,
    subject: Subject<AISummaryState>,
  ): Promise<void> {
    try {
      const request: GenerateSummaryRequest = { sessionId: sessionId };

      // Call the edge function through DbService
      const response = await this.callEdgeFunction("openrouter", request);

      if (response.error) {
        throw new Error(
          `API Error: ${response.error.message || "Unknown error"}`,
        );
      }

      const data = response.data as GenerateSummaryAsyncResponse;

      // Emit success state
      subject.next({
        isGenerating: false,
        summary: data.summary,
        canGenerate: true,
        error: null,
      });

      // Handle completion
      await this.handleGenerationComplete(sessionId);

      subject.complete();
    } catch (error) {
      this.handleGenerationError(sessionId, error);

      // Emit error state
      subject.next({
        isGenerating: false,
        summary: null,
        canGenerate: true,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      subject.complete();
    }
  }

  /**
   * Starts polling for generation status updates
   * @private
   */
  private startGenerationPolling(
    sessionId: number,
  ): Observable<SummaryGenerationStatus> {
    return timer(0, AI_SUMMARY.POLLING_INTERVAL).pipe(
      switchMap(() => this.getSession(sessionId)),
      map(
        (session) =>
          ({
            isGenerating: session?.summary ? false : true,
            summary: session?.summary || null,
            error: null,
          }) as SummaryGenerationStatus,
      ),
      takeUntil(this.destroy$),
      catchError((error) => {
        this.handlePollingError(sessionId, error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Handles completion of summary generation
   * @private
   */
  private async handleGenerationComplete(sessionId: number): Promise<void> {
    try {
      await this.refreshSessionData(sessionId);
      this.showMessage(AI_MESSAGES.SUCCESS, "success");
      this.stopPolling(sessionId);
    } catch (error) {
      console.error("Error handling generation completion:", error);
    }
  }

  /**
   * Checks if summary can be generated for the session
   */
  async canGenerateSummary(sessionId: number): Promise<boolean> {
    try {
      const [user, session] = await Promise.all([
        this.getCurrentUser(),
        this.getSession(sessionId),
      ]);

      if (!user || !session) {
        return false;
      }

      // Check if user is not already generating
      if (user.generating_started_at) {
        return false;
      }

      // Check if session belongs to user
      if (session.user_id !== user.id) {
        return false;
      }

      // Check if session already has a summary
      if (session.summary) {
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking if can generate summary:", error);
      return false;
    }
  }

  /**
   * Checks if summary is currently being generated
   */
  async isGenerating(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return !!user?.generating_started_at;
    } catch (error) {
      console.error("Error checking generation status:", error);
      return false;
    }
  }

  /**
   * Stops polling for a specific session
   */
  stopPolling(sessionId: number): void {
    const interval = this.pollingIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(sessionId);
    }
  }

  /**
   * Clears debounce timer for a session
   * @private
   */
  private clearDebounceTimer(sessionId: number): void {
    const timer = this.debounceTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(sessionId);
    }
  }

  /**
   * Gets current authenticated user
   * @private
   */
  private async getCurrentUser(): Promise<User | null> {
    return this.dbService.getCurrentUserWithAIStatus();
  }

  /**
   * Gets session by ID
   * @private
   */
  private async getSession(sessionId: number): Promise<Session | null> {
    return this.dbService.getSession(sessionId);
  }

  /**
   * Refreshes session data after summary generation
   * @private
   */
  private async refreshSessionData(sessionId: number): Promise<void> {
    try {
      await this.dbService.refreshSession(sessionId);
    } catch (error) {
      console.error("Error refreshing session data:", error);
      throw error;
    }
  }

  /**
   * Handles generation errors
   * @private
   */
  private handleGenerationError(sessionId: number, error: unknown): void {
    console.error("Generation error for session", sessionId, ":", error);

    let message: string = AI_MESSAGES.ERROR_GENERIC;
    const errorObj = error as Error;

    if (errorObj?.name === "TimeoutError") {
      message = AI_MESSAGES.ERROR_TIMEOUT;
    } else if (
      errorObj?.message?.includes("network") ||
      errorObj?.message?.includes("fetch")
    ) {
      message = AI_MESSAGES.ERROR_NETWORK;
    } else if (
      errorObj?.message?.includes("401") ||
      errorObj?.message?.includes("unauthorized")
    ) {
      message = AI_MESSAGES.ERROR_UNAUTHORIZED;
    } else if (
      errorObj?.message?.includes("404") ||
      errorObj?.message?.includes("not found")
    ) {
      message = AI_MESSAGES.ERROR_SESSION_NOT_FOUND;
    }

    this.showMessage(message, "error");
    this.stopPolling(sessionId);
  }

  /**
   * Handles timeout errors
   * @private
   */
  private handleTimeout(sessionId: number): void {
    this.showMessage(AI_MESSAGES.ERROR_TIMEOUT, "error");
    this.stopPolling(sessionId);
  }

  /**
   * Handles polling errors
   * @private
   */
  private handlePollingError(sessionId: number, error: unknown): void {
    console.error("Polling error for session", sessionId, ":", error);
    this.showMessage(AI_MESSAGES.ERROR_GENERIC, "error");
    this.stopPolling(sessionId);
  }

  /**
   * Shows message to user via snackbar
   * @private
   */
  private showMessage(
    message: string,
    type: "success" | "error" | "info" = "info",
  ): void {
    const config = {
      duration: 4000,
      horizontalPosition: "center" as const,
      verticalPosition: "bottom" as const,
    };

    switch (type) {
      case "success":
        this.snackBar.open(message, "Zamknij", {
          ...config,
          panelClass: ["success-snackbar"],
        });
        break;
      case "error":
        this.snackBar.open(message, "Zamknij", {
          ...config,
          panelClass: ["error-snackbar"],
        });
        break;
      default:
        this.snackBar.open(message, "Zamknij", config);
    }
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    // Clear all polling intervals
    this.pollingIntervals.forEach((interval) => clearInterval(interval));
    this.pollingIntervals.clear();

    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    // Complete destroy subject
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Call Supabase Edge Function
   * @private
   */
  private async callEdgeFunction(
    functionName: string,
    body: GenerateSummaryRequest,
    async = true,
  ): Promise<{ data: unknown; error: { message?: string } | null }> {
    const supabaseClient = (this.dbService as any).supabaseService.client;

    const payload = {
      body: { ...body },
    };

    if (async) {
      payload.body.async = true;
    }

    const result = await supabaseClient.functions.invoke(functionName, payload);

    return result;
  }
}
