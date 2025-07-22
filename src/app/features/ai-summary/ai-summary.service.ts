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

  private debounceTimers = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Generates AI summary for a training session
   * @param sessionId - ID of the session to summarize
   * @returns Observable with generation status updates
   */
  async generateSessionSummary(
    sessionId: number,
  ): Promise<void> {
    // Clear any existing debounce timer for this session
    this.clearDebounceTimer(sessionId);

    // Check if can generate
    const canGenerate = await this.canGenerateSummary(sessionId);
    if (!canGenerate) {
      throw new Error("Cannot generate summary for this session");
    }

    // Set up debounce timer to prevent rapid successive calls
    return new Promise((resolve, reject) => {
      const debounceTimer = setTimeout(async () => {
        try {
          await this.executeGeneration(sessionId);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, AI_SUMMARY.DEBOUNCE_DELAY);

      this.debounceTimers.set(sessionId, debounceTimer);
    });
  }

  /**
   * Executes the actual generation process
   * @private
   */
  private async executeGeneration(sessionId: number): Promise<void> {
    try {
      const request: GenerateSummaryRequest = { sessionId: sessionId };

      // Call the edge function in async mode
      const response = await this.callEdgeFunction("openrouter", request);

      if (response.error) {
        throw new Error(
          `API Error: ${response.error.message || "Unknown error"}`,
        );
      }

      const data = response.data as GenerateSummaryAsyncResponse;

      // Check if generation started successfully
      if (data.status === "error") {
        throw new Error(data.error || "Failed to start generation");
      }

      // Show success message - generation started
      this.showMessage(AI_MESSAGES.GENERATING, "info");
    } catch (error) {
      this.handleGenerationError(sessionId, error);
      throw error;
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
    } else if (
      errorObj?.message?.includes("Cannot generate") ||
      errorObj?.message?.includes("already generating")
    ) {
      message = AI_MESSAGES.ALREADY_GENERATING;
    }

    this.showMessage(message, "error");
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
    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Call Supabase Edge Function
   * @private
   */
  private async callEdgeFunction(
    functionName: string,
    body: GenerateSummaryRequest,
  ): Promise<{ data: unknown; error: { message?: string } | null }> {
    const payload: Record<string, unknown> = { ...body };

    return this.dbService.callEdgeFunction(functionName, payload);
  }
}
