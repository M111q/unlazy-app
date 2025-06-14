import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../shared/material.module';

// Component props interface
interface PageHeaderProps {
  title: string;
  sessionId: number;
  sessionDate: string;
  onEditSession: () => void;
  onAddSet: () => void;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div class="breadcrumb">
        <button mat-button (click)="onBackToSessions.emit()" class="breadcrumb-button">
          <mat-icon>arrow_back</mat-icon>
          Treningi
        </button>
        <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
        <span class="breadcrumb-current">Szczegóły treningu</span>
      </div>

      <div class="header-content">
        <h1 class="page-title">{{ title }}</h1>
        <div class="header-actions">
          <button
            mat-raised-button
            color="primary"
            (click)="onEditSession.emit()"
            [disabled]="disabled"
            class="action-button"
          >
            <mat-icon>edit</mat-icon>
            Edytuj sesję
          </button>
          <button
            mat-raised-button
            color="accent"
            (click)="onAddSet.emit()"
            [disabled]="disabled || isSetLimitReached"
            class="action-button"
          >
            <mat-icon>add</mat-icon>
            Dodaj serię
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./page-header.component.scss'],
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
