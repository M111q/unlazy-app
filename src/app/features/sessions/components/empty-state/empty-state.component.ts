import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from "@angular/core";
import { CommonModule } from "@angular/common";

import { MaterialModule } from "../../../../shared/material.module";

@Component({
  selector: "app-empty-state",
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: "./empty-state.component.html",
  styleUrl: "./empty-state.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  @Output() addFirstSession = new EventEmitter<void>();

  /**
   * Handle add first session button click
   */
  onAddFirstSession(): void {
    this.addFirstSession.emit();
  }
}
