import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

import { MaterialModule } from "../../../../shared/material.module";

@Component({
  selector: "app-auth-layout",
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule],
  templateUrl: "./auth-layout.component.html",
  styleUrl: "./auth-layout.component.scss",
})
export class AuthLayoutComponent {
  readonly currentYear = new Date().getFullYear();
  readonly appName = "Unlazy";
  readonly appDescription = "Śledź swoje treningi siłowe";
}
