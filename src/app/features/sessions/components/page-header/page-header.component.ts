import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MaterialModule } from "../../../../shared/material.module";

// Component props interface
interface PageHeaderProps {
  title: string;
  sessionId: number;
  sessionDate: string;
  onEditSession: () => void;
  onAddSet: () => void;
}

@Component({
  selector: "app-page-header",
  standalone: true,
  imports: [CommonModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-lg">
      <div
        class="d-flex align-center justify-start mb-sm text-sm text-secondary"
      >
        <button
          mat-button
          (click)="onBackToSessions.emit()"
          class="d-flex align-center gap-xs p-xs rounded border-0 bg-transparent text-secondary cursor-pointer hover:bg-primary hover:bg-opacity-10 transition-hover"
        >
          <mat-icon class="text-lg">arrow_back</mat-icon>
          Treningi
        </button>
        <mat-icon class="mx-xs text-lg text-disabled">chevron_right</mat-icon>
        <span class="font-medium text-primary">Szczegóły treningu</span>
      </div>

      <div class="d-flex align-start justify-between gap-md mobile-stack">
        <h1
          class="text-3xl font-normal leading-tight text-primary m-0 flex-grow-1 mobile-text-xl mobile-mb-md"
        >
          {{ title }}
        </h1>
        <div
          class="d-flex align-center gap-md flex-shrink-0 mobile-stack mobile-gap-xs"
        >
          <button
            mat-raised-button
            (click)="onEditSession.emit()"
            [disabled]="disabled"
            class="btn-primary d-flex align-center gap-xs mobile-full-width"
          >
            <mat-icon class="text-lg">edit</mat-icon>
            Edytuj sesję
          </button>
          <button
            mat-raised-button
            (click)="onAddSet.emit()"
            [disabled]="disabled || isSetLimitReached"
            class="btn-secondary d-flex align-center gap-xs mobile-full-width"
            [class.btn-primary]="!disabled && !isSetLimitReached"
          >
            <mat-icon class="text-lg">add</mat-icon>
            Dodaj serię
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ["./page-header.component.scss"],
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) sessionId!: number;
  @Input({ required: true }) sessionDate!: string;
  @Input() disabled = false;
  @Input() isSetLimitReached = false;

  @Output() onBackToSessions = new EventEmitter<void>();
  @Output() onEditSession = new EventEmitter<void>();
  @Output() onAddSet = new EventEmitter<void>();
}
