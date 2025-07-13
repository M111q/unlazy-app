import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MaterialModule } from '../../../shared/material.module';

@Component({
  selector: 'app-ai-summary',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './ai-summary.component.html',
  styleUrl: './ai-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AISummaryComponent {
  @Input() summary: string | null = null;
  @Input() isGenerating = false;
}
