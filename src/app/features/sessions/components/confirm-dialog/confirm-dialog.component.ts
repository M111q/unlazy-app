import { Component, Inject, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from "@angular/material/dialog";

import { MaterialModule } from "../../../../shared/material.module";

// Dialog data interface
export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

// Dialog result interface
export interface ConfirmDialogResult {
  confirmed: boolean;
}

@Component({
  selector: "app-confirm-dialog",
  standalone: true,
  imports: [CommonModule, MaterialModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon
          class="dialog-icon"
          [class.warning-icon]="data.isDestructive"
          aria-hidden="true"
        >
          {{ data.isDestructive ? "warning" : "help" }}
        </mat-icon>
        {{ data.title }}
      </h2>

      <mat-dialog-content class="dialog-content">
        <p class="dialog-message">{{ data.message }}</p>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions" align="end">
        <button
          mat-button
          type="button"
          (click)="onCancel()"
          class="cancel-button"
          [attr.aria-label]="getCancelAriaLabel()"
        >
          {{ data.cancelText || "Anuluj" }}
        </button>
        <button
          mat-raised-button
          type="button"
          (click)="onConfirm()"
          [color]="data.isDestructive ? 'warn' : 'primary'"
          class="confirm-button"
          [class.destructive-button]="data.isDestructive"
          [attr.aria-label]="getConfirmAriaLabel()"
          cdkTrapFocus
        >
          {{ data.confirmText || (data.isDestructive ? "Usuń" : "Potwierdź") }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styleUrls: ["./confirm-dialog.component.scss"],
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent, ConfirmDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {
    // Set dialog configuration
    this.dialogRef.disableClose = false;
  }

  /**
   * Handle confirm button click
   */
  protected onConfirm(): void {
    this.dialogRef.close({ confirmed: true });
  }

  /**
   * Handle cancel button click
   */
  protected onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  /**
   * Get aria-label for cancel button
   */
  protected getCancelAriaLabel(): string {
    return `${this.data.cancelText || "Anuluj"} - ${this.data.title}`;
  }

  /**
   * Get aria-label for confirm button
   */
  protected getConfirmAriaLabel(): string {
    const actionText =
      this.data.confirmText || (this.data.isDestructive ? "Usuń" : "Potwierdź");
    return `${actionText} - ${this.data.title}`;
  }

  /**
   * Handle escape key press
   */
  protected onEscapeKey(): void {
    this.onCancel();
  }

  /**
   * Handle backdrop click
   */
  protected onBackdropClick(): void {
    this.onCancel();
  }
}
