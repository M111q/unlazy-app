import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import { CommonModule } from "@angular/common";

import { MaterialModule } from "../../../../shared/material.module";
import { StatsCardComponent } from "../stats-card/stats-card.component";
import { SessionItemViewModel } from "../../types/sessions-view-models";

@Component({
  selector: "app-session-accordion",
  standalone: true,
  imports: [CommonModule, MaterialModule, StatsCardComponent],
  templateUrl: "./session-accordion.component.html",
  styleUrl: "./session-accordion.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionAccordionComponent {
  @Input({ required: true }) sessions: SessionItemViewModel[] = [];

  @Output() editSession = new EventEmitter<SessionItemViewModel>();
  @Output() deleteSession = new EventEmitter<number>();
  @Output() viewDetails = new EventEmitter<number>();

  /**
   * Handle edit session button click
   */
  onEditSession(session: SessionItemViewModel): void {
    this.editSession.emit(session);
  }

  /**
   * Handle delete session button click
   */
  onDeleteSession(sessionId: number): void {
    this.deleteSession.emit(sessionId);
  }

  /**
   * Handle view details button click
   */
  onViewDetails(sessionId: number): void {
    this.viewDetails.emit(sessionId);
  }

  /**
   * TrackBy function for sessions list to optimize rendering performance
   */
  trackBySessionId(index: number, session: SessionItemViewModel): number {
    return session.id;
  }

  /**
   * Prevent event propagation when clicking action buttons
   */
  stopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
