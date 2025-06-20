import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MaterialModule } from '../../../shared/material.module';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <div class="icon-container">
          <mat-icon class="unauthorized-icon">block</mat-icon>
        </div>

        <h1 class="unauthorized-title">Brak dostępu</h1>

        <p class="unauthorized-message">
          Nie masz uprawnień do przeglądania tej strony.
        </p>

        <p class="unauthorized-description">
          Jeśli uważasz, że to błąd, skontaktuj się z administratorem
          lub spróbuj zalogować się ponownie.
        </p>

        <div class="unauthorized-actions">
          <button mat-raised-button
                  color="primary"
                  (click)="goToSessions()"
                  class="action-button">
            <mat-icon>home</mat-icon>
            Powrót do głównej
          </button>

          <button mat-button
                  color="accent"
                  (click)="signOut()"
                  class="action-button">
            <mat-icon>logout</mat-icon>
            Wyloguj się
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .unauthorized-content {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 16px;
      padding: 48px 32px;
      text-align: center;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .icon-container {
      margin-bottom: 24px;
    }

    .unauthorized-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #f44336;
      background-color: #ffebee;
      border-radius: 50%;
      padding: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .unauthorized-title {
      font-size: 2rem;
      font-weight: 500;
      margin: 0 0 16px 0;
      color: rgba(0, 0, 0, 0.87);
    }

    .unauthorized-message {
      font-size: 1.125rem;
      color: rgba(0, 0, 0, 0.7);
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    .unauthorized-description {
      font-size: 0.875rem;
      color: rgba(0, 0, 0, 0.6);
      margin: 0 0 32px 0;
      line-height: 1.4;
    }

    .unauthorized-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }

    .action-button {
      min-width: 200px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 8px !important;
      text-transform: none !important;
      font-weight: 500;
    }

    .action-button .mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    @media (min-width: 600px) {
      .unauthorized-actions {
        flex-direction: row;
        justify-content: center;
      }
    }

    @media (max-width: 768px) {
      .unauthorized-container {
        padding: 16px;
      }

      .unauthorized-content {
        padding: 32px 24px;
      }

      .unauthorized-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        padding: 12px;
      }

      .unauthorized-title {
        font-size: 1.5rem;
      }

      .unauthorized-message {
        font-size: 1rem;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .action-button {
        transition: none;
      }
    }

    @media (prefers-contrast: high) {
      .unauthorized-content {
        background: #fff;
        border: 2px solid #000;
      }

      .unauthorized-icon {
        background-color: #fff;
        border: 2px solid #f44336;
      }
    }
  `]
})
export class UnauthorizedPageComponent {
  private readonly router = inject(Router);

  /**
   * Navigate to sessions page
   */
  goToSessions(): void {
    this.router.navigate(['/sessions']);
  }

  /**
   * Sign out and redirect to login
   */
  signOut(): void {
    // TODO: Integrate with AuthService when needed
    this.router.navigate(['/auth/login']);
  }
}
