import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";

import { MaterialModule } from "../../../../shared/material.module";
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
import { CreateSessionDto, UpdateSessionDto } from "../../../../../types";
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

  // Reactive view model from service
  protected readonly viewModel = computed(() =>
    this.sessionListService.viewModel(),
  );

  // Local component state
  private readonly isModalOpen = signal(false);
  private readonly editingSessionId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadInitialData();
  }

  /**
   * Load initial session data
   */
  private loadInitialData(): void {
    this.sessionListService.loadSessions(0);
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

    if (!viewModel.canAddSession) {
      this.snackBar.open(ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED, "Zamknij", {
        duration: 5000,
        panelClass: ["error-snack-bar"],
      });
      return;
    }

    this.openSessionFormModal("create");
  }

  /**
   * Handle adding first session from empty state
   */
  onAddFirstSession(): void {
    this.onAddSession();
  }

  /**
   * Handle editing session
   */
  onEditSession(session: SessionItemViewModel): void {
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
      this.sessionListService
        .addSession(sessionData as CreateSessionDto)
        .subscribe({
          next: () => {
            this.snackBar.open("Sesja została dodana", "Zamknij", {
              duration: 3000,
              panelClass: ["success-snack-bar"],
            });
          },
          error: (error) => {
            this.snackBar.open(
              error.message || "Błąd podczas dodawania sesji",
              "Zamknij",
              {
                duration: 5000,
                panelClass: ["error-snack-bar"],
              },
            );
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
              this.snackBar.open("Sesja została zaktualizowana", "Zamknij", {
                duration: 3000,
                panelClass: ["success-snack-bar"],
              });
            },
            error: (error) => {
              this.snackBar.open(
                error.message || "Błąd podczas aktualizacji sesji",
                "Zamknij",
                {
                  duration: 5000,
                  panelClass: ["error-snack-bar"],
                },
              );
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
        this.snackBar.open(
          error.message || "Błąd podczas usuwania sesji",
          "Zamknij",
          {
            duration: 5000,
            panelClass: ["error-snack-bar"],
          },
        );
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
