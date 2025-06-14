import { Routes } from "@angular/router";

export const routes: Routes = [
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
    redirectTo: "/sessions",
    pathMatch: "full",
  },
  {
    path: "**",
    redirectTo: "/sessions",
  },
];
