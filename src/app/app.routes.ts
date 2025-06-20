import { Routes } from "@angular/router";
import { authGuard, guestGuard } from "./core/auth";
import { MainLayoutComponent } from "./shared/layouts/main-layout/main-layout.component";

export const routes: Routes = [
  {
    path: "auth",
    canActivate: [guestGuard],
    children: [
      {
        path: "login",
        loadComponent: () =>
          import("./features/auth/pages/auth-page/auth-page.component").then(
            (m) => m.AuthPageComponent,
          ),
        title: "Logowanie - Unlazy",
      },
      {
        path: "register",
        loadComponent: () =>
          import("./features/auth/pages/auth-page/auth-page.component").then(
            (m) => m.AuthPageComponent,
          ),
        title: "Rejestracja - Unlazy",
      },
      {
        path: "reset-password",
        loadComponent: () =>
          import("./features/auth/pages/auth-page/auth-page.component").then(
            (m) => m.AuthPageComponent,
          ),
        title: "Resetowanie hasła - Unlazy",
      },
      {
        path: "",
        redirectTo: "login",
        pathMatch: "full",
      },
    ],
  },
  {
    path: "sessions",
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: "",
        loadChildren: () =>
          import("./features/sessions/sessions.module").then(
            (m) => m.SessionsModule,
          ),
      },
    ],
    title: "Sesje treningowe - Unlazy",
  },
  {
    path: "unauthorized",
    loadComponent: () =>
      import("./features/shared/pages/unauthorized-page.component").then(
        (c) => c.UnauthorizedPageComponent,
      ),
    title: "Brak dostępu - Unlazy",
  },
  {
    path: "",
    redirectTo: "/sessions",
    pathMatch: "full",
  },
  {
    path: "**",
    redirectTo: "/auth/login",
  },
];
