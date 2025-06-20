import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TopNavigationComponent } from '../../components/top-navigation/top-navigation.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    TopNavigationComponent
  ],
  template: `
    <div class="main-layout">
      <app-top-navigation></app-top-navigation>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .main-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }

    .main-content {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
    }

    @media (max-width: 768px) {
      .main-content {
        padding: 8px;
      }
    }
  `]
})
export class MainLayoutComponent {}
