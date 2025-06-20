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
import { AuthService } from "../../../../core/auth";

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
  private readonly authService = inject(AuthService);

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
  async onLoginSubmit(loginData: LoginFormData): Promise<void> {
    this.isLoading.set(true);
    this.globalError.set(null);

    console.log("Login attempt:", { email: loginData.email });

    try {
      await this.authService.signIn(loginData);
      this.handleLoginSuccess();
    } catch (error: unknown) {
      this.handleLoginError(error);
    }
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

    // Navigate to returnUrl if present, otherwise to sessions page
    const returnUrl =
      this.route.snapshot.queryParams["returnUrl"] || "/sessions";
    this.router.navigate([returnUrl]);
  }

  /**
   * Handle login error
   */
  private handleLoginError(error: unknown): void {
    this.isLoading.set(false);
    this.loginComponent?.resetSubmissionState();

    console.error("Login error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Nieprawidłowy email lub hasło";
    const errors: AuthValidationError[] = [
      {
        field: "email",
        message: errorMessage,
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
  async onRegisterSubmit(registerData: RegisterFormData): Promise<void> {
    this.isLoading.set(true);
    this.globalError.set(null);

    console.log("Registration attempt:", { email: registerData.email });

    try {
      await this.authService.signUp(registerData);
      this.handleRegistrationSuccess();
    } catch (error: unknown) {
      this.handleRegistrationError(error);
    }
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
  private handleRegistrationError(error: unknown): void {
    this.isLoading.set(false);
    this.registerComponent?.resetSubmissionState();

    console.error("Registration error:", error);

    // Check if it's an email already taken error
    const errorMessage = error instanceof Error ? error.message : "";
    if (
      errorMessage.includes("already registered") ||
      errorMessage.includes("already exists")
    ) {
      this.handleEmailTakenError();
      return;
    }

    this.globalError.set(
      errorMessage || "Rejestracja nieudana. Spróbuj ponownie.",
    );
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
  async onResetPasswordSubmit(resetData: ResetPasswordFormData): Promise<void> {
    this.isLoading.set(true);
    this.globalError.set(null);

    console.log("Reset password attempt:", { email: resetData.email });

    try {
      await this.authService.resetPassword(resetData);
      this.handleResetPasswordSuccess();
    } catch (error: unknown) {
      this.handleResetPasswordError(error);
    }
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
  private handleResetPasswordError(error: unknown): void {
    this.isLoading.set(false);
    this.resetPasswordComponent?.resetSubmissionState();

    console.error("Reset password error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Nie udało się wysłać linku. Spróbuj ponownie.";
    this.globalError.set(errorMessage);
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
