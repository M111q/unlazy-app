import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { PageEvent } from "@angular/material/paginator";

import { MaterialModule } from "../../../../shared/material.module";
import { ExerciseSetWithExercise } from "../../../../../types";
import { SessionSetItemComponent } from "../session-set-item/session-set-item.component";

// Component props interface
interface SessionSetsListProps {
  sets: ExerciseSetWithExercise[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onEditSet: (setId: number) => void;
  onDeleteSet: (setId: number) => void;
}

@Component({
  selector: "app-session-sets-list",
  standalone: true,
  imports: [CommonModule, MaterialModule, SessionSetItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="shadow border rounded-lg bg-white">
      <mat-card-header class="mb-sm">
        <mat-card-title class="text-xl font-medium text-primary m-0"
          >Serie ćwiczeń</mat-card-title
        >
        <mat-card-subtitle class="text-secondary text-sm mt-xs m-0">
          {{ totalCount }}
          {{ getSetsCountLabel(totalCount) }}
        </mat-card-subtitle>
      </mat-card-header>
      <mat-card-content class="p-md mobile-p-sm">
        <!-- Loading State -->
        <div *ngIf="loading" class="loading-state">
          <mat-spinner diameter="32"></mat-spinner>
          <span class="text-secondary text-sm m-0">Ładowanie serii...</span>
        </div>

        <!-- Empty State -->
        <div *ngIf="!loading && sets.length === 0" class="empty-state">
          <mat-icon class="text-6xl text-gray-300 mb-xs"
            >fitness_center</mat-icon
          >
          <h3 class="text-xl font-medium text-primary m-0 mobile-text-lg">
            Brak serii ćwiczeń
          </h3>
          <p
            class="text-secondary text-sm m-0 text-center leading-relaxed mobile-text-xs"
            style="max-width: 300px;"
          >
            Ta sesja nie zawiera jeszcze żadnych serii ćwiczeń.
          </p>
          <button
            mat-raised-button
            (click)="onAddSet.emit()"
            [disabled]="disabled"
            class="btn-primary d-flex align-center gap-xs mt-xs mobile-full-width"
            style="max-width: 200px;"
          >
            <mat-icon class="text-lg">add</mat-icon>
            Dodaj pierwszą serię
          </button>
        </div>

        <!-- Sets List -->
        <div *ngIf="!loading && sets.length > 0" class="d-flex flex-column">
          <div
            class="d-flex flex-column gap-sm mb-md mobile-gap-xs mobile-mb-sm"
          >
            <app-session-set-item
              *ngFor="let set of sets; trackBy: trackBySetId"
              [set]="set"
              [isDeleting]="deletingSetId === set.id"
              [disabled]="disabled || deletingSetId !== null"
              (editSet)="onEditSet.emit($event)"
              (deleteSet)="onDeleteSet.emit($event)"
              class="w-full"
            ></app-session-set-item>
          </div>

          <!-- Pagination -->
          <mat-paginator
            *ngIf="shouldShowPagination()"
            [length]="totalCount"
            [pageSize]="itemsPerPage"
            [pageIndex]="currentPage - 1"
            [pageSizeOptions]="[]"
            [showFirstLastButtons]="true"
            [hidePageSize]="true"
            [disabled]="disabled || loading"
            (page)="onPageChange.emit($event.pageIndex + 1)"
            aria-label="Wybierz stronę serii ćwiczeń"
            class="mt-md border-top-subtle pt-md mobile-mt-sm mobile-pt-sm"
          >
          </mat-paginator>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styleUrls: ["./session-sets-list.component.scss"],
})
export class SessionSetsListComponent {
  @Input({ required: true }) sets: ExerciseSetWithExercise[] = [];
  @Input() loading = false;
  @Input({ required: true }) totalCount = 0;
  @Input({ required: true }) currentPage = 1;
  @Input({ required: true }) itemsPerPage = 20;
  @Input() deletingSetId: number | null = null;
  @Input() disabled = false;

  @Output() onPageChange = new EventEmitter<number>();
  @Output() onEditSet = new EventEmitter<number>();
  @Output() onDeleteSet = new EventEmitter<number>();
  @Output() onAddSet = new EventEmitter<void>();

  /**
   * Get appropriate label for sets count
   * Polish language has different forms for different numbers
   */
  protected getSetsCountLabel(count: number): string {
    if (count === 0) return "serii";
    if (count === 1) return "seria";
    if (count >= 2 && count <= 4) return "serie";
    return "serii";
  }

  /**
   * Determine if pagination should be shown
   * Only show if there are more items than fit on one page
   */
  protected shouldShowPagination(): boolean {
    return this.totalCount > this.itemsPerPage;
  }

  /**
   * Get total number of pages
   */
  protected getTotalPages(): number {
    return Math.ceil(this.totalCount / this.itemsPerPage);
  }

  /**
   * Check if current page has next page
   */
  protected hasNextPage(): boolean {
    return this.currentPage < this.getTotalPages();
  }

  /**
   * Check if current page has previous page
   */
  protected hasPrevPage(): boolean {
    return this.currentPage > 1;
  }

  /**
   * TrackBy function for ngFor optimization
   * Helps Angular track changes in the sets array
   */
  protected trackBySetId(index: number, set: ExerciseSetWithExercise): number {
    return set.id;
  }

  /**
   * Handle pagination page change event
   */
  protected handlePageChange(event: PageEvent): void {
    // Convert from 0-based to 1-based page index
    const newPage = event.pageIndex + 1;

    if (newPage !== this.currentPage) {
      this.onPageChange.emit(newPage);
    }
  }

  /**
   * Get pagination info for accessibility
   */
  protected getPaginationInfo(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.totalCount);

    return `Wyświetlanie ${start}-${end} z ${this.totalCount} serii`;
  }

  /**
   * Check if sets array is valid
   */
  protected get hasValidSets(): boolean {
    return Array.isArray(this.sets) && this.sets.length > 0;
  }

  /**
   * Get current page display info
   */
  protected getCurrentPageInfo(): string {
    const totalPages = this.getTotalPages();
    return `Strona ${this.currentPage} z ${totalPages}`;
  }
}
