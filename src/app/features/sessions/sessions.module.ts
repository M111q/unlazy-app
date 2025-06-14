import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { RouterModule, Routes } from "@angular/router";

import { MaterialModule } from "../../shared/material.module";

const routes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./components/session-list/session-list.component").then(
        (c) => c.SessionListComponent,
      ),
    data: { title: "Sesje treningowe" },
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./components/session-details/session-details.component").then(
        (c) => c.SessionDetailsComponent,
      ),
    data: { title: "Szczegóły treningu" },
  },
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    RouterModule.forChild(routes),
  ],
  exports: [RouterModule],
})
export class SessionsModule {}
