import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { AuthService } from "../../../core/auth/auth.service";

@Component({
  selector: "app-top-navigation",
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar color="primary" class="top-navigation">
      <div class="nav-content">
        <!-- Logo -->
        <div
          class="logo-section"
          [class.clickable]="authService.currentUser()"
          (click)="onLogoClick()"
        >
          <span class="logo-text">Unlazy</span>
          <span class="logo-subtitle">gym app</span>
        </div>

        <!-- User Email (center) -->
        <div class="user-section" *ngIf="authService.currentUser() as user">
          <span class="user-email">{{ user.email }}</span>
        </div>

        <!-- Logout Button -->
        <div class="actions-section">
          <button
            mat-button
            (click)="onLogout()"
            [disabled]="authService.isLoading()"
            class="logout-button"
          >
            <mat-icon>logout</mat-icon>
            Wyloguj
          </button>
        </div>
      </div>
    </mat-toolbar>
  `,
  styles: [
    `
      .top-navigation {
        position: sticky;
        top: 0;
        z-index: 1000;
      }

      .nav-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
      }

      .logo-section {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
      }

      .logo-section.clickable {
        cursor: pointer;
        transition: opacity 0.2s ease;
      }

      .logo-section.clickable:hover {
        opacity: 0.8;
      }

      .logo-text {
        font-size: 1.2rem;
        font-weight: 600;
        line-height: 1;
      }

      .logo-subtitle {
        font-size: 0.8rem;
        opacity: 0.8;
        line-height: 1;
      }

      .user-section {
        flex: 1;
        text-align: center;
      }

      .user-email {
        font-size: 0.9rem;
        opacity: 0.9;
      }

      .actions-section {
        display: flex;
        align-items: center;
        color: black;
      }

      .logout-button {
        color: black;
      }

      @media (max-width: 768px) {
        .user-email {
          display: none;
        }

        .logo-subtitle {
          display: none;
        }
      }
    `,
  ],
})
export class TopNavigationComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  onLogoClick(): void {
    if (this.authService.currentUser()) {
      this.router.navigate(["/sessions"]);
    }
  }

  async onLogout(): Promise<void> {
    await this.authService.signOut();
  }
}
