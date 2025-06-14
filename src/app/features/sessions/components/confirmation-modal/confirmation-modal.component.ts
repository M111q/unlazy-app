import {
  ChangeDetectionStrategy,
  Component,
  Inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
} from '@angular/material/dialog';

import { MaterialModule } from '../../../../shared/material.module';

export interface ConfirmationModalData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  confirmColor?: 'primary' | 'accent' | 'warn';
  sessionDescription?: string;
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationModalComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmationModalComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: ConfirmationModalData,
  ) {}

  /**
   * Handle confirmation action
   */
  onConfirm(): void {
    this.dialogRef.close(true);
  }

  /**
   * Handle cancellation action
   */
  onCancel(): void {
    this.dialogRef.close(false);
  }

  /**
   * Handle dialog close via backdrop or escape
   */
  onNoClick(): void {
    this.dialogRef.close(false);
  }

  /**
   * Get the appropriate icon for the confirmation type
   */
  get confirmationIcon(): string {
    if (this.data.confirmColor === 'warn') {
      return 'warning';
    }
    return 'help_outline';
  }

  /**
   * Get the confirmation button color
   */
  get confirmButtonColor(): 'primary' | 'accent' | 'warn' {
    return this.data.confirmColor || 'primary';
  }
}
