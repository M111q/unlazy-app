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
    title: "Sesje treningowe - Unlazy",
  },
  {
    path: ":id",
    loadComponent: () =>
      import("./components/session-details/session-details.component").then(
        (c) => c.SessionDetailsComponent,
      ),
    title: "Szczegóły treningu - Unlazy",
  },
  {
    path: ":id/sets/new",
    loadComponent: () =>
      import("./components/add-set-page/add-set-page.component").then(
        (c) => c.AddSetPageComponent,
      ),
    title: "Dodaj serię - Unlazy",
  },
  {
    path: ":id/sets/:setId/edit",
    loadComponent: () =>
      import("./components/edit-set-page/edit-set-page.component").then(
        (c) => c.EditSetPageComponent,
      ),
    title: "Edytuj serię - Unlazy",
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
