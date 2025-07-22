import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";

import { MaterialModule } from "../../../../shared/material.module";
import { AISummaryService } from "../../../ai-summary/ai-summary.service";
import { SessionListService } from "../../services/session-list.service";
import { SessionAccordionComponent } from "../session-accordion/session-accordion.component";
import { EmptyStateComponent } from "../empty-state/empty-state.component";
import {
  SessionFormModalComponent,
  SessionFormModalData,
} from "../session-form-modal/session-form-modal.component";
import {
  ConfirmationModalComponent,
  ConfirmationModalData,
} from "../confirmation-modal/confirmation-modal.component";
import { SessionItemViewModel } from "../../types/sessions-view-models";
import {
  CreateSessionDto,
  UpdateSessionDto,
} from "../../../../../types";
import { ERROR_MESSAGES } from "../../../../constants";

@Component({
  selector: "app-session-list",
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    SessionAccordionComponent,
    EmptyStateComponent,
  ],
  templateUrl: "./session-list.component.html",
  styleUrl: "./session-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionListComponent implements OnInit {
  private readonly sessionListService = inject(SessionListService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly aiSummaryService = inject(AISummaryService);

  // Reactive view model from service
  protected readonly viewModel = computed(() =>
    this.sessionListService.viewModel(),
  );

  // Local component state
  private readonly isModalOpen = signal(false);
  private readonly editingSessionId = signal<number | null>(null);
  private readonly expandedSessionId = signal<number | null>(null);

  // Getter for template access
  get expandedSession(): number | null {
    return this.expandedSessionId();
  }

  // Getter to check if any session is generating
  get isAnyGenerating(): boolean {
    return this.viewModel().sessions.some(session => session.isGenerating);
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.handleQueryParams();
  }

  /**
   * Load initial session data
   */
  private loadInitialData(): void {
    this.sessionListService.loadSessions(0);
  }

  /**
   * Handle query parameters for editing sessions and showing specific sessions
   */
  private handleQueryParams(): void {
    this.route.queryParams.subscribe((params) => {
      const editSessionId = params["edit"];
      const showSessionId = params["show"];

      if (editSessionId) {
        const sessionId = parseInt(editSessionId, 10);
        if (!isNaN(sessionId)) {
          // Set expanded session for accordion
          this.expandedSessionId.set(sessionId);

          // Wait for sessions to load, then open edit modal
          setTimeout(() => {
            this.openEditModalForSession(sessionId);
          }, 100);

          // Clear query params
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
          });
        }
      } else if (showSessionId) {
        const sessionId = parseInt(showSessionId, 10);
        if (!isNaN(sessionId)) {
          // Set expanded session for accordion
          this.expandedSessionId.set(sessionId);

          // Clear query params
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true,
          });
        }
      }
    });
  }

  /**
   * Open edit modal for specific session ID
   */
  private openEditModalForSession(sessionId: number): void {
    const viewModel = this.viewModel();
    const session = viewModel.sessions.find((s) => s.id === sessionId);

    if (session) {
      this.onEditSession(session);
    }
  }

  /**
   * Handle page change from paginator
   */
  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.sessionListService.loadSessions(event.pageIndex);
  }

  /**
   * Handle adding new session - opens modal if daily limit allows
   */
  onAddSession(): void {
    const viewModel = this.viewModel();
    console.log("viewModel 1", viewModel);

    if (!viewModel.canAddSession) {
      this.snackBar.open(ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED, "Zamknij", {
        duration: 5000,
        panelClass: ["error-snack-bar"],
      });
      return;
    }
    console.log("viewModel 2", viewModel);
    this.openSessionFormModal("create");
  }

  /**
   * Handle adding first session from empty state
   */
  onAddFirstSession(): void {
    console.log("onAddFirst");
    this.onAddSession();
  }

  /**
   * Handle editing session
   */
  onEditSession(session: SessionItemViewModel): void {
    // Set the expanded session to the one being edited
    this.expandedSessionId.set(session.id);
    this.openSessionFormModal("edit", session);
  }

  /**
   * Handle deleting session - opens confirmation modal
   */
  onDeleteSession(sessionId: number): void {
    this.openConfirmationModal(sessionId);
  }

  /**
   * Handle viewing session details
   */
  onViewSessionDetails(sessionId: number): void {
    this.router.navigate(["/sessions", sessionId]);
  }

  /**
   * Handle AI summary generation - generate summary in place
   */
  async onGenerateAISummary(sessionId: number): Promise<void> {
    // Check if user is already generating a summary
    const isGenerating = await this.aiSummaryService.isGenerating();
    if (isGenerating) {
      this.snackBar.open(
        "Poczekaj na zakończenie bieżącego generowania podsumowania",
        "Zamknij",
        {
          duration: 3000,
          panelClass: ["warning-snack-bar"],
        },
      );
      return;
    }

    try {
      // Update the session's generating state locally
      this.sessionListService.updateSessionGeneratingState(sessionId, true);

      // Generate summary - this now returns void and works in the background
      await this.aiSummaryService.generateSessionSummary(sessionId);

      // Start polling for completion
      this.startSummaryPolling(sessionId);
    } catch (error) {
      console.error("Failed to start AI summary generation:", error);
      this.sessionListService.updateSessionGeneratingState(sessionId, false);

      const errorMessage = error instanceof Error ? error.message : "Nie można rozpocząć generowania podsumowania";
      this.snackBar.open(
        errorMessage,
        "Zamknij",
        {
          duration: 5000,
          panelClass: ["error-snack-bar"],
        },
      );
    }
  }

  /**
   * Poll for summary generation completion
   */
  private startSummaryPolling(sessionId: number): void {
    const pollInterval = setInterval(async () => {
      try {
        // Check if generation is still in progress
        const isGenerating = await this.aiSummaryService.isGenerating();

        if (!isGenerating) {
          // Generation completed - refresh to get the new summary
          clearInterval(pollInterval);
          this.sessionListService.updateSessionGeneratingState(sessionId, false);
          this.sessionListService.refreshCurrentPage();
          this.snackBar.open(
            "Podsumowanie zostało wygenerowane",
            "Zamknij",
            {
              duration: 3000,
              panelClass: ["success-snack-bar"],
            },
          );
        }
      } catch (error) {
        console.error("Error polling for summary status:", error);
        clearInterval(pollInterval);
        this.sessionListService.updateSessionGeneratingState(sessionId, false);
      }
    }, 2000); // Poll every 2 seconds

    // Stop polling after 60 seconds
    setTimeout(() => {
      clearInterval(pollInterval);
      this.sessionListService.updateSessionGeneratingState(sessionId, false);
    }, 60000);
  }

  /**
   * Handle retry when error occurs
   */
  onRetry(): void {
    const currentPage = this.viewModel().pagination.currentPage;
    this.sessionListService.loadSessions(currentPage);
  }

  /**
   * Open session form modal for create or edit
   */
  private openSessionFormModal(
    mode: "create" | "edit",
    session?: SessionItemViewModel,
  ): void {
    if (this.isModalOpen()) return;

    this.isModalOpen.set(true);

    // Track editing session ID for edit mode
    if (mode === "edit" && session) {
      this.editingSessionId.set(session.id);
    } else {
      this.editingSessionId.set(null);
    }

    const modalData: SessionFormModalData = { mode, session };
    console.log("modalData", modalData);
    const dialogRef = this.dialog.open(SessionFormModalComponent, {
      width: "500px",
      maxWidth: "90vw",
      data: modalData,
      disableClose: true,
      autoFocus: true,
      restoreFocus: true,
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.isModalOpen.set(false);
      if (result) {
        this.handleSessionSaved(result, mode);
      }
      // Clear editing session ID
      this.editingSessionId.set(null);
    });
  }

  /**
   * Open confirmation modal for session deletion
   */
  private openConfirmationModal(sessionId: number): void {
    if (this.isModalOpen()) return;

    this.isModalOpen.set(true);

    const session = this.viewModel().sessions.find((s) => s.id === sessionId);
    const sessionDescription = session?.description || "sesję bez opisu";

    const modalData: ConfirmationModalData = {
      title: "Usuń sesję",
      message: `Czy na pewno chcesz usunąć ${sessionDescription}?`,
      confirmText: "Usuń",
      cancelText: "Anuluj",
      confirmColor: "warn",
      sessionDescription: session?.description || undefined,
    };

    const dialogRef = this.dialog.open(ConfirmationModalComponent, {
      width: "400px",
      maxWidth: "90vw",
      data: modalData,
      autoFocus: true,
      restoreFocus: true,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      this.isModalOpen.set(false);
      if (confirmed) {
        this.handleSessionDelete(sessionId);
      }
    });
  }

  /**
   * Handle session saved (created or updated)
   */
  private handleSessionSaved(
    sessionData: CreateSessionDto | UpdateSessionDto,
    mode: "create" | "edit",
  ): void {
    if (mode === "create") {
      console.log(
        "SessionListComponent: Handling session creation",
        sessionData,
      );

      this.sessionListService
        .addSession(sessionData as CreateSessionDto)
        .subscribe({
          next: () => {
            console.log("SessionListComponent: Session created successfully");
            this.snackBar.open("Sesja została dodana", "Zamknij", {
              duration: 3000,
              panelClass: ["success-snack-bar"],
            });
          },
          error: (error) => {
            console.error(
              "SessionListComponent: Error creating session:",
              error,
            );

            // Check if this is an authentication error
            if (error.message?.includes("User not authenticated")) {
              console.warn(
                "SessionListComponent: Authentication error detected, showing specific message",
              );
              this.snackBar.open(
                "Sesja wygasła. Odśwież stronę i spróbuj ponownie.",
                "Zamknij",
                {
                  duration: 7000,
                  panelClass: ["error-snack-bar"],
                },
              );
            } else {
              this.snackBar.open(
                error.message || "Błąd podczas dodawania sesji",
                "Zamknij",
                {
                  duration: 5000,
                  panelClass: ["error-snack-bar"],
                },
              );
            }
          },
        });
    } else {
      // Handle edit case
      const sessionId = this.editingSessionId();
      if (sessionId) {
        this.sessionListService
          .updateSession(sessionId, sessionData as UpdateSessionDto)
          .subscribe({
            next: () => {
              // Keep the edited session expanded
              this.expandedSessionId.set(sessionId);
              this.snackBar.open("Sesja została zaktualizowana", "Zamknij", {
                duration: 3000,
                panelClass: ["success-snack-bar"],
              });
            },
            error: (error) => {
              // Check if this is an authentication error
              if (error.message?.includes("User not authenticated")) {
                this.snackBar.open(
                  "Sesja wygasła. Odśwież stronę i spróbuj ponownie.",
                  "Zamknij",
                  {
                    duration: 7000,
                    panelClass: ["error-snack-bar"],
                  },
                );
              } else {
                this.snackBar.open(
                  error.message || "Błąd podczas aktualizacji sesji",
                  "Zamknij",
                  {
                    duration: 5000,
                    panelClass: ["error-snack-bar"],
                  },
                );
              }
            },
          });
      }
    }
  }

  /**
   * Handle session deletion
   */
  private handleSessionDelete(sessionId: number): void {
    this.sessionListService.deleteSession(sessionId).subscribe({
      next: () => {
        this.snackBar.open("Sesja została usunięta", "Zamknij", {
          duration: 3000,
          panelClass: ["success-snack-bar"],
        });
      },
      error: (error) => {
        // Check if this is an authentication error
        if (error.message?.includes("User not authenticated")) {
          this.snackBar.open(
            "Sesja wygasła. Odśwież stronę i spróbuj ponownie.",
            "Zamknij",
            {
              duration: 7000,
              panelClass: ["error-snack-bar"],
            },
          );
        } else {
          this.snackBar.open(
            error.message || "Błąd podczas usuwania sesji",
            "Zamknij",
            {
              duration: 5000,
              panelClass: ["error-snack-bar"],
            },
          );
        }
      },
    });
  }

  /**
   * TrackBy function for sessions list to optimize rendering performance
   */
  protected trackBySessionId(
    index: number,
    session: SessionItemViewModel,
  ): number {
    return session.id;
  }
}
