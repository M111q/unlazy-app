import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "auth",
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
    loadChildren: () =>
      import("./features/sessions/sessions.module").then(
        (m) => m.SessionsModule,
      ),
    // TODO: Add AuthGuard when implemented
    // canActivate: [AuthGuard]
  },
  {
    path: "",
    redirectTo: "/auth/login",
    pathMatch: "full",
  },
  {
    path: "**",
    redirectTo: "/auth/login",
  },
];
