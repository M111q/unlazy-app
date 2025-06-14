import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from '../../../../shared/material.module';
import { SessionStats } from '../../types/sessions-view-models';

@Component({
  selector: 'app-stats-card',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './stats-card.component.html',
  styleUrl: './stats-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCardComponent {
  @Input({ required: true }) stats: SessionStats = {
    totalWeight: 0,
    totalReps: 0,
  };

  /**
   * Get validated total weight value
   * Ensures the value is a non-negative number
   */
  get validatedTotalWeight(): number {
    return this.isValidNumber(this.stats.totalWeight) ? this.stats.totalWeight : 0;
  }

  /**
   * Get validated total reps value
   * Ensures the value is a non-negative number
   */
  get validatedTotalReps(): number {
    return this.isValidNumber(this.stats.totalReps) ? this.stats.totalReps : 0;
  }

  /**
   * Format weight value for display
   * Shows up to 1 decimal place, removes unnecessary .0
   */
  get formattedWeight(): string {
    const weight = this.validatedTotalWeight;
    return weight % 1 === 0 ? weight.toString() : weight.toFixed(1);
  }

  /**
   * Format reps value for display
   * Always shows as integer
   */
  get formattedReps(): string {
    return Math.floor(this.validatedTotalReps).toString();
  }

  /**
   * Check if a value is a valid non-negative number
   */
  private isValidNumber(value: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= 0;
  }
}
