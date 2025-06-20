import {
  ApplicationConfig,
  provideZoneChangeDetection,
  inject,
} from "@angular/core";
import { provideRouter, TitleStrategy } from "@angular/router";
import { provideAnimations } from "@angular/platform-browser/animations";
import { Title } from "@angular/platform-browser";
import { Injectable } from "@angular/core";
import { RouterStateSnapshot } from "@angular/router";

import { routes } from "./app.routes";

@Injectable({ providedIn: "root" })
export class CustomTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(routerState: RouterStateSnapshot): void {
    const title = this.buildTitle(routerState);
    if (title !== undefined) {
      this.title.setTitle(title);
    }
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    { provide: TitleStrategy, useClass: CustomTitleStrategy },
  ],
};
