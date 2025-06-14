import {
  Component,
  Input,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../shared/material.module';
import { SessionWithStats } from '../../../../../types';

// Component props interface
interface SessionDetailsProps {
  session: SessionWithStats;
}

@Component({
  selector: 'app-session-details-card',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="session-details-card">
      <mat-card-header>
        <mat-card-title>Informacje o sesji</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <div class="session-info">
          <div class="info-item">
            <mat-icon class="info-icon">schedule</mat-icon>
            <div class="info-content">
              <strong class="info-label">Data i godzina:</strong>
              <span class="info-value">{{ formatSessionDateTime(session.session_datetime) }}</span>
            </div>
          </div>

          <div class="info-item" *ngIf="session.description">
            <mat-icon class="info-icon">description</mat-icon>
            <div class="info-content">
              <strong class="info-label">Opis:</strong>
              <span class="info-value">{{ session.description }}</span>
            </div>
          </div>

          <div class="info-item" *ngIf="session.location">
            <mat-icon class="info-icon">location_on</mat-icon>
            <div class="info-content">
              <strong class="info-label">Miejsce:</strong>
              <span class="info-value">{{ session.location }}</span>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ['./session-details-card.component.scss'],
})
export class SessionDetailsCardComponent {
  @Input({ required: true }) session!: SessionWithStats;

  protected formatSessionDateTime(datetime: string): string {
    if (!datetime) return '';

    try {
      const date = new Date(datetime);

      // Validate date
      if (isNaN(date.getTime())) {
        console.warn('Invalid date format:', datetime);
        return datetime;
      }

      return date.toLocaleString('pl-PL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return datetime;
    }
  }
}
