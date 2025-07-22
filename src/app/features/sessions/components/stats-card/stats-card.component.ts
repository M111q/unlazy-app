import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";

import { MaterialModule } from "../../../../shared/material.module";
import { AISummaryService } from "../../../ai-summary/ai-summary.service";

@Component({
  selector: "app-stats-card",
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: "./stats-card.component.html",
  styleUrl: "./stats-card.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsCardComponent {
  private readonly aiSummaryService = inject(AISummaryService);

  @Input({ required: true }) totalWeight = 0;
  @Input({ required: true }) totalReps = 0;
  @Input({ required: true }) exerciseCount = 0;
  @Input() hasExerciseSets = false;
  @Input() hasSummary = false;
  @Input() isGenerating = false;
  @Input() isAnyGenerating = false;

  @Output() generateSummary = new EventEmitter<void>();

  /**
   * Check if AI icon should be shown
   * Shows when session has exercise sets but no summary
   */
  get canShowAIIcon(): boolean {
    return this.hasExerciseSets && !this.hasSummary;
  }

  /**
   * Check if AI generation is currently allowed
   * Blocked when this session or any other session is generating
   */
  get canGenerateNow(): boolean {
    return !this.isGenerating && !this.isAnyGenerating;
  }

  /**
   * Handle AI generation button click
   */
  onGenerateAI(): void {
    if (this.canShowAIIcon && this.canGenerateNow) {
      this.generateSummary.emit();
    }
  }

  /**
   * Get validated total weight value
   * Ensures the value is a non-negative number
   */
  get validatedTotalWeight(): number {
    return this.isValidNumber(this.totalWeight) ? this.totalWeight : 0;
  }

  /**
   * Get validated total reps value
   * Ensures the value is a non-negative number
   */
  get validatedTotalReps(): number {
    return this.isValidNumber(this.totalReps) ? this.totalReps : 0;
  }

  /**
   * Get validated exercise count value
   * Ensures the value is a non-negative number
   */
  get validatedExerciseCount(): number {
    return this.isValidNumber(this.exerciseCount) ? this.exerciseCount : 0;
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
   * Format exercise count for display
   * Always shows as integer
   */
  get formattedExerciseCount(): string {
    return Math.floor(this.validatedExerciseCount).toString();
  }

  /**
   * Check if a value is a valid non-negative number
   */
  private isValidNumber(value: number): boolean {
    return typeof value === "number" && !isNaN(value) && value >= 0;
  }
}
