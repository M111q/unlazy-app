import { Component, OnInit, signal, ViewChild, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";
import { MatSnackBar } from "@angular/material/snack-bar";

import { MaterialModule } from "../../../../shared/material.module";
import { AuthLayoutComponent } from "../../components/auth-layout/auth-layout.component";
import { LoginComponent } from "../../components/login/login.component";
import { RegisterComponent } from "../../components/register/register.component";
import { ResetPasswordComponent } from "../../components/reset-password/reset-password.component";
import {
  LoginFormData,
  RegisterFormData,
  ResetPasswordFormData,
} from "../../../../../types";
import { AuthValidationError } from "../../types/auth-validation";

type AuthPageMode = "login" | "register" | "reset-password";

@Component({
  selector: "app-auth-page",
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    AuthLayoutComponent,
    LoginComponent,
    RegisterComponent,
    ResetPasswordComponent,
  ],
  templateUrl: "./auth-page.component.html",
  styleUrl: "./auth-page.component.scss",
})
export class AuthPageComponent implements OnInit {
  @ViewChild(LoginComponent) loginComponent?: LoginComponent;
  @ViewChild(RegisterComponent) registerComponent?: RegisterComponent;
  @ViewChild(ResetPasswordComponent)
  resetPasswordComponent?: ResetPasswordComponent;

  // Inject services
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  // State management
  protected readonly currentMode = signal<AuthPageMode>("login");
  protected readonly isLoading = signal<boolean>(false);
  protected readonly globalError = signal<string | null>(null);

  ngOnInit(): void {
    console.log("AuthPageComponent initialized");
    this.setupRouteSubscription();
  }

  /**
   * Setup route subscription to determine current auth mode
   */
  private setupRouteSubscription(): void {
    // Determine initial mode based on route
    const currentRoute = this.router.url;

    if (currentRoute.includes("/register")) {
      this.currentMode.set("register");
    } else if (currentRoute.includes("/reset-password")) {
      this.currentMode.set("reset-password");
    } else {
      console.log("Defaulting to login mode");
      this.currentMode.set("login");
    }
  }

  /**
   * Handle login form submission
   */
  onLoginSubmit(loginData: LoginFormData): void {
    this.isLoading.set(true);
    this.globalError.set(null);

    console.log("Login attempt:", { email: loginData.email });

    // TODO: Replace with actual AuthService call
    // Simulate API call
    setTimeout(() => {
      // Mock validation - simulate different scenarios
      if (loginData.email === "error@test.com") {
        this.handleLoginError();
      } else if (loginData.email === "notfound@test.com") {
        this.handleUserNotFound();
      } else {
        this.handleLoginSuccess();
      }
    }, 1500);
  }

  /**
   * Handle successful login
   */
  private handleLoginSuccess(): void {
    this.isLoading.set(false);
    this.loginComponent?.resetSubmissionState();

    this.snackBar.open("Zalogowano pomyślnie!", "Zamknij", {
      duration: 3000,
      panelClass: ["success-snackbar"],
    });

    // TODO: Navigate to dashboard/sessions when auth is implemented
    console.log("Login successful - would navigate to /sessions");
    // this.router.navigate(["/sessions"]);
  }

  /**
   * Handle login error
   */
  private handleLoginError(): void {
    this.isLoading.set(false);
    this.loginComponent?.resetSubmissionState();

    const errors: AuthValidationError[] = [
      {
        field: "email",
        message: "Nieprawidłowy email lub hasło",
        code: "INVALID_CREDENTIALS",
      },
    ];

    this.loginComponent?.setFormErrors(errors);
    this.globalError.set("Logowanie nieudane. Sprawdź swoje dane.");
  }

  /**
   * Handle user not found error
   */
  private handleUserNotFound(): void {
    this.isLoading.set(false);
    this.loginComponent?.resetSubmissionState();

    const errors: AuthValidationError[] = [
      {
        field: "email",
        message: "Użytkownik nie został znaleziony",
        code: "USER_NOT_FOUND",
      },
    ];

    this.loginComponent?.setFormErrors(errors);
  }

  /**
   * Handle registration form submission
   */
  onRegisterSubmit(registerData: RegisterFormData): void {
    this.isLoading.set(true);
    this.globalError.set(null);

    console.log("Registration attempt:", { email: registerData.email });

    // TODO: Replace with actual AuthService call
    // Simulate API call
    setTimeout(() => {
      // Mock validation - simulate different scenarios
      if (registerData.email === "taken@test.com") {
        this.handleEmailTakenError();
      } else if (registerData.email === "error@test.com") {
        this.handleRegistrationError();
      } else {
        this.handleRegistrationSuccess();
      }
    }, 2000);
  }

  /**
   * Handle successful registration
   */
  private handleRegistrationSuccess(): void {
    this.isLoading.set(false);
    this.registerComponent?.resetSubmissionState();

    this.snackBar.open(
      "Konto zostało utworzone! Sprawdź email, aby je aktywować.",
      "Zamknij",
      {
        duration: 5000,
        panelClass: ["success-snackbar"],
      },
    );

    // Navigate to login after successful registration
    this.router.navigate(["/auth/login"]);
  }

  /**
   * Handle registration error
   */
  private handleRegistrationError(): void {
    this.isLoading.set(false);
    this.registerComponent?.resetSubmissionState();

    this.globalError.set("Rejestracja nieudana. Spróbuj ponownie.");
  }

  /**
   * Handle email already taken error
   */
  private handleEmailTakenError(): void {
    this.isLoading.set(false);
    this.registerComponent?.resetSubmissionState();

    const errors: AuthValidationError[] = [
      {
        field: "email",
        message: "Ten adres email jest już zajęty",
        code: "EMAIL_TAKEN",
      },
    ];

    this.registerComponent?.setFormErrors(errors);
  }

  /**
   * Handle reset password form submission
   */
  onResetPasswordSubmit(resetData: ResetPasswordFormData): void {
    this.isLoading.set(true);
    this.globalError.set(null);

    console.log("Reset password attempt:", { email: resetData.email });

    // TODO: Replace with actual AuthService call
    // Simulate API call
    setTimeout(() => {
      // Mock validation - simulate different scenarios
      if (resetData.email === "error@test.com") {
        this.handleResetPasswordError();
      } else {
        this.handleResetPasswordSuccess();
      }
    }, 1500);
  }

  /**
   * Handle successful password reset
   */
  private handleResetPasswordSuccess(): void {
    this.isLoading.set(false);
    this.resetPasswordComponent?.resetSubmissionState();
    this.resetPasswordComponent?.markEmailAsSent();

    this.snackBar.open("Link do resetowania hasła został wysłany!", "Zamknij", {
      duration: 4000,
      panelClass: ["success-snackbar"],
    });
  }

  /**
   * Handle reset password error
   */
  private handleResetPasswordError(): void {
    this.isLoading.set(false);
    this.resetPasswordComponent?.resetSubmissionState();

    this.globalError.set("Nie udało się wysłać linku. Spróbuj ponownie.");
  }

  /**
   * Clear global error
   */
  clearGlobalError(): void {
    this.globalError.set(null);
  }

  /**
   * Get current component title for accessibility
   */
  get pageTitle(): string {
    switch (this.currentMode()) {
      case "register":
        return "Rejestracja - Unlazy";
      case "reset-password":
        return "Resetowanie hasła - Unlazy";
      default:
        return "Logowanie - Unlazy";
    }
  }

  /**
   * Get current route for template
   */
  get isLoginMode(): boolean {
    return this.currentMode() === "login";
  }

  get isRegisterMode(): boolean {
    return this.currentMode() === "register";
  }

  get isResetPasswordMode(): boolean {
    return this.currentMode() === "reset-password";
  }
}
