import { Injectable, inject, signal, computed, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { DomSanitizer } from "@angular/platform-browser";

import { DbService } from "../../data/db.service";
import { SupabaseService } from "../../data/supabase.service";
import {
  AuthUser,
  AuthSession,
  AuthState,
  LoginFormData,
  RegisterFormData,
  ResetPasswordFormData,
} from "../../../types";

/**
 * Central authentication service for managing user authentication state
 * Provides reactive state management with Angular signals
 * Handles token refresh, session persistence, and auth state changes
 */
@Injectable({
  providedIn: "root",
})
export class AuthService implements OnDestroy {
  // Inject dependencies
  private readonly router = inject(Router);
  private readonly dbService = inject(DbService);
  private readonly supabaseService = inject(SupabaseService);
  private readonly sanitizer = inject(DomSanitizer);

  // Signals for reactive programming
  private readonly authStateSignal = signal<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Subscription cleanup function
  private authStateChangeUnsubscribe?: () => void;
  private readonly localStorage =
    typeof window !== "undefined" ? window.localStorage : null;

  // Session and security management
  private sessionTimeoutId?: number;
  private lastActivityTime = Date.now();
  private isPerformingOperation = false; // Track if we're in the middle of an operation

  // Constants
  private readonly AUTH_STORAGE_KEY = "unlazy_auth_state";
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes
  private readonly SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private readonly RATE_LIMIT_STORAGE_KEY = "unlazy_login_attempts";

  constructor() {
    this.initializeAuthService();
  }

  // ========================================
  // PUBLIC REACTIVE STATE ACCESSORS
  // ========================================

  /**
   * Signal for authentication state (reactive)
   */
  get authState() {
    return this.authStateSignal.asReadonly();
  }

  /**
   * Computed signal for authenticated status
   */
  readonly isAuthenticated = computed(() => this.authState().isAuthenticated);

  /**
   * Computed signal for current user
   */
  readonly currentUser = computed(() => this.authState().user);

  /**
   * Computed signal for loading state
   */
  readonly isLoading = computed(() => this.authState().isLoading);

  /**
   * Computed signal for error state
   */
  readonly error = computed(() => this.authState().error);

  // ========================================
  // PUBLIC AUTHENTICATION METHODS
  // ========================================

  /**
   * Sign in user with email and password
   * @param loginData - User login credentials
   * @returns Promise with authentication response
   */
  async signIn(loginData: LoginFormData): Promise<void> {
    this.setLoading(true);
    this.clearError();

    try {
      // Check rate limiting before attempting login
      this.checkRateLimit(loginData.email);

      // Sanitize and validate input data
      const sanitizedData = this.sanitizeLoginData(loginData);

      const response = await this.dbService.signIn(
        sanitizedData.email,
        sanitizedData.password,
      );

      // Clear failed attempts on successful login
      this.clearFailedAttempts(sanitizedData.email);

      await this.handleAuthSuccess(response.user, response.session);
    } catch (error) {
      // Record failed attempt
      this.recordFailedAttempt(loginData.email);
      this.handleAuthError(error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Register new user with email and password
   * @param registerData - User registration data
   * @returns Promise with authentication response
   */
  async signUp(registerData: RegisterFormData): Promise<void> {
    this.setLoading(true);
    this.clearError();

    try {
      // Sanitize and validate input data
      const sanitizedData = this.sanitizeRegisterData(registerData);

      const response = await this.dbService.signUp(
        sanitizedData.email,
        sanitizedData.password,
      );
      await this.handleAuthSuccess(response.user, response.session);
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Send password reset email
   * @param resetData - Password reset data
   * @returns Promise that resolves when email is sent
   */
  async resetPassword(resetData: ResetPasswordFormData): Promise<void> {
    this.setLoading(true);
    this.clearError();

    try {
      // Sanitize and validate email
      const sanitizedEmail = this.sanitizeEmail(resetData.email);

      await this.dbService.resetPassword(sanitizedEmail);
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Sign out current user
   * @returns Promise that resolves when sign out is complete
   */
  async signOut(): Promise<void> {
    this.setLoading(true);

    try {
      await this.dbService.signOut();
      this.handleSignOut();
    } catch (error) {
      console.error("Sign out error:", error);
      // Force local sign out even if server call fails
      this.handleSignOut();
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Refresh current user session
   * @returns Promise that resolves when session is refreshed
   */
  async refreshSession(): Promise<void> {
    this.isPerformingOperation = true;
    try {
      const user = await this.dbService.getCurrentUser();
      if (user) {
        const currentState = this.authStateSignal();
        this.updateAuthState({
          ...currentState,
          user,
          isAuthenticated: true,
        });
      } else {
        this.handleSignOut();
      }
    } catch (error) {
      console.error("Session refresh error:", error);
      // Only sign out if we're sure it's a real auth error
      if (
        !this.isUserAuthenticated() ||
        (error instanceof Error && error.message?.includes("not authenticated"))
      ) {
        this.handleSignOut();
      }
    } finally {
      this.isPerformingOperation = false;
    }
  }

  // ========================================
  // PUBLIC UTILITY METHODS
  // ========================================

  /**
   * Check if user is authenticated
   * @returns Current authentication status
   */
  isUserAuthenticated(): boolean {
    return this.authStateSignal().isAuthenticated;
  }

  /**
   * Get current user synchronously
   * @returns Current user or null
   */
  getCurrentUserSync(): AuthUser | null {
    return this.authStateSignal().user;
  }

  /**
   * Clear authentication error
   */
  clearAuthError(): void {
    this.clearError();
  }

  // ========================================
  // PRIVATE INITIALIZATION METHODS
  // ========================================

  /**
   * Initialize authentication service
   */
  private async initializeAuthService(): Promise<void> {
    try {
      // Setup auth state change listener first to catch any immediate auth events
      this.setupAuthStateChangeListener();

      // Load persisted state
      this.loadPersistedState();

      // Check current session (this will set loading to false when complete)
      await this.checkCurrentSession();
    } catch (error) {
      console.error("Auth service initialization error:", error);
      // Set proper error state
      this.updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: "Initialization failed",
      });
    }
  }

  /**
   * Setup authentication state change listener
   */
  private setupAuthStateChangeListener(): void {
    // Store the unsubscribe function returned by onAuthStateChange
    this.authStateChangeUnsubscribe = this.supabaseService.onAuthStateChange(
      (event, session) => {
        console.log(
          "Auth state change:",
          event,
          session,
          "isPerformingOperation:",
          this.isPerformingOperation,
        );

        switch (event) {
          case "SIGNED_IN":
            if (session?.user) {
              console.log("Auth event: User signed in", session.user.email);
              this.handleAuthSuccess(
                {
                  id: session.user.id,
                  email: session.user.email || "",
                },
                {
                  access_token: session.access_token,
                },
              );
            }
            break;

          case "SIGNED_OUT":
            // Don't handle sign out events during operations to prevent race conditions
            if (this.isPerformingOperation) {
              console.log("Auth event: Ignoring SIGNED_OUT during operation");
              return;
            }
            console.log("Auth event: User signed out");
            this.handleSignOut();
            break;

          case "TOKEN_REFRESHED":
            if (session) {
              console.log("Auth event: Token refreshed");
              const currentState = this.authStateSignal();
              this.updateAuthState({
                ...currentState,
                session: {
                  access_token: session.access_token,
                },
              });
            }
            break;

          default:
            // Handle other auth events if needed
            break;
        }
      },
    );
  }

  /**
   * Check current authentication session
   */
  private async checkCurrentSession(): Promise<void> {
    this.isPerformingOperation = true;
    try {
      const user = await this.dbService.getCurrentUser();
      if (user) {
        // User is authenticated
        this.updateAuthState({
          user,
          session: this.authStateSignal().session, // Keep existing session if any
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        console.log("Session check: User authenticated", user.email);
      } else {
        // No authenticated user
        this.updateAuthState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        console.log("Session check: No authenticated user");
      }
    } catch (error) {
      console.error("Check session error:", error);
      // Clear state on error
      this.updateAuthState({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } finally {
      this.isPerformingOperation = false;
    }
  }

  // ========================================
  // PRIVATE STATE MANAGEMENT METHODS
  // ========================================

  /**
   * Handle successful authentication
   */
  private async handleAuthSuccess(
    user: AuthUser,
    session: AuthSession,
  ): Promise<void> {
    // Sanitize user data before storing
    const sanitizedUser = this.sanitizeUserData(user);

    const newState: AuthState = {
      user: sanitizedUser,
      session,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    };

    this.updateAuthState(newState);
    this.persistAuthState(newState);

    // Setup session management
    this.setupSessionTimeout();
    this.updateLastActivity();

    console.log("Authentication successful:", sanitizedUser.email);
  }

  /**
   * Handle authentication error
   */
  private handleAuthError(error: unknown): void {
    const errorMessage =
      error instanceof Error ? error.message : "Authentication failed";

    const currentState = this.authStateSignal();
    this.updateAuthState({
      ...currentState,
      error: errorMessage,
      isLoading: false,
    });

    console.error("Authentication error:", error);
  }

  /**
   * Handle sign out
   */
  private handleSignOut(): void {
    // Clear session timeout
    this.clearSessionTimeout();

    const newState: AuthState = {
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    };

    this.updateAuthState(newState);
    this.clearPersistedState();

    // Navigate to login page
    this.router.navigate(["/auth/login"]);

    console.log("User signed out");
  }

  /**
   * Update authentication state signal
   */
  private updateAuthState(newState: AuthState): void {
    this.authStateSignal.set(newState);
  }

  /**
   * Set loading state
   */
  private setLoading(isLoading: boolean): void {
    const currentState = this.authStateSignal();
    this.updateAuthState({
      ...currentState,
      isLoading,
    });
  }

  /**
   * Clear error state
   */
  private clearError(): void {
    const currentState = this.authStateSignal();
    if (currentState.error) {
      this.updateAuthState({
        ...currentState,
        error: null,
      });
    }
  }

  // ========================================
  // PRIVATE SESSION MANAGEMENT METHODS
  // ========================================

  /**
   * Setup session timeout monitoring
   */
  private setupSessionTimeout(): void {
    this.clearSessionTimeout();

    this.sessionTimeoutId = window.setTimeout(() => {
      console.log("Session timeout reached, signing out");
      this.signOut();
    }, this.SESSION_TIMEOUT);
  }

  /**
   * Clear session timeout
   */
  private clearSessionTimeout(): void {
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId);
      this.sessionTimeoutId = undefined;
    }
  }

  /**
   * Update last activity time and reset session timeout
   */
  private updateLastActivity(): void {
    this.lastActivityTime = Date.now();

    if (this.isAuthenticated()) {
      this.setupSessionTimeout();
    }
  }

  /**
   * Check if session has expired due to inactivity
   */
  private checkSessionExpiry(): boolean {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivityTime;

    if (timeSinceActivity > this.SESSION_TIMEOUT) {
      console.log("Session expired due to inactivity");
      this.signOut();
      return true;
    }

    return false;
  }

  // ========================================
  // PRIVATE RATE LIMITING METHODS
  // ========================================

  /**
   * Check rate limiting for login attempts
   */
  private checkRateLimit(email: string): void {
    if (!this.localStorage) return;

    try {
      const attemptsData = this.localStorage.getItem(
        this.RATE_LIMIT_STORAGE_KEY,
      );
      if (!attemptsData) return;

      const attempts = JSON.parse(attemptsData);
      const sanitizedEmail = this.sanitizeEmail(email);
      const userAttempts = attempts[sanitizedEmail] || [];

      // Clean old attempts outside the window
      const now = Date.now();
      const recentAttempts = userAttempts.filter(
        (timestamp: number) => now - timestamp < this.LOGIN_ATTEMPT_WINDOW,
      );

      if (recentAttempts.length >= this.MAX_LOGIN_ATTEMPTS) {
        const nextAllowedTime = recentAttempts[0] + this.LOGIN_ATTEMPT_WINDOW;
        const waitMinutes = Math.ceil((nextAllowedTime - now) / (60 * 1000));

        throw new Error(
          `Too many login attempts. Please try again in ${waitMinutes} minutes.`,
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Too many login attempts")
      ) {
        throw error;
      }
      // If there's an issue with rate limiting data, clear it
      this.localStorage.removeItem(this.RATE_LIMIT_STORAGE_KEY);
    }
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(email: string): void {
    if (!this.localStorage) return;

    try {
      const sanitizedEmail = this.sanitizeEmail(email);
      const attemptsData = this.localStorage.getItem(
        this.RATE_LIMIT_STORAGE_KEY,
      );
      const attempts = attemptsData ? JSON.parse(attemptsData) : {};

      const userAttempts = attempts[sanitizedEmail] || [];
      const now = Date.now();

      // Add current attempt and clean old ones
      userAttempts.push(now);
      attempts[sanitizedEmail] = userAttempts.filter(
        (timestamp: number) => now - timestamp < this.LOGIN_ATTEMPT_WINDOW,
      );

      this.localStorage.setItem(
        this.RATE_LIMIT_STORAGE_KEY,
        JSON.stringify(attempts),
      );
    } catch (error) {
      console.warn("Failed to record login attempt:", error);
    }
  }

  /**
   * Clear failed attempts for successful login
   */
  private clearFailedAttempts(email: string): void {
    if (!this.localStorage) return;

    try {
      const sanitizedEmail = this.sanitizeEmail(email);
      const attemptsData = this.localStorage.getItem(
        this.RATE_LIMIT_STORAGE_KEY,
      );
      if (!attemptsData) return;

      const attempts = JSON.parse(attemptsData);
      delete attempts[sanitizedEmail];

      if (Object.keys(attempts).length === 0) {
        this.localStorage.removeItem(this.RATE_LIMIT_STORAGE_KEY);
      } else {
        this.localStorage.setItem(
          this.RATE_LIMIT_STORAGE_KEY,
          JSON.stringify(attempts),
        );
      }
    } catch (error) {
      console.warn("Failed to clear login attempts:", error);
    }
  }

  // ========================================
  // PRIVATE SECURITY AND VALIDATION METHODS
  // ========================================

  /**
   * Sanitize login form data to prevent XSS attacks
   */
  private sanitizeLoginData(loginData: LoginFormData): LoginFormData {
    return {
      email: this.sanitizeEmail(loginData.email),
      password: this.sanitizePassword(loginData.password),
    };
  }

  /**
   * Sanitize registration form data to prevent XSS attacks
   */
  private sanitizeRegisterData(
    registerData: RegisterFormData,
  ): RegisterFormData {
    return {
      email: this.sanitizeEmail(registerData.email),
      password: this.sanitizePassword(registerData.password),
      confirmPassword: this.sanitizePassword(registerData.confirmPassword),
    };
  }

  /**
   * Sanitize email input
   */
  private sanitizeEmail(email: string): string {
    if (!email || typeof email !== "string") {
      throw new Error("Invalid email format");
    }

    // Remove potential XSS characters and normalize
    const sanitized = email
      .trim()
      .toLowerCase()
      .replace(/[<>'"]/g, "") // Remove common XSS characters
      .substring(0, 254); // Limit length

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error("Invalid email format");
    }

    return sanitized;
  }

  /**
   * Sanitize password input
   */
  private sanitizePassword(password: string): string {
    if (!password || typeof password !== "string") {
      throw new Error("Invalid password format");
    }

    // Basic validation without modifying the password content
    if (password.length < 8 || password.length > 128) {
      throw new Error("Password must be between 8 and 128 characters");
    }

    // Check for null bytes and other dangerous characters
    if (password.includes("\0") || password.includes("\x00")) {
      throw new Error("Invalid password format");
    }

    return password;
  }

  /**
   * Sanitize user data before storing
   */
  private sanitizeUserData(user: AuthUser): AuthUser {
    return {
      id: this.sanitizeString(user.id, "User ID"),
      email: this.sanitizeEmail(user.email),
    };
  }

  /**
   * Generic string sanitization
   */
  private sanitizeString(value: string, fieldName: string): string {
    if (!value || typeof value !== "string") {
      throw new Error(`Invalid ${fieldName} format`);
    }

    // Remove HTML tags and potential XSS content
    const sanitized = value
      .trim()
      .replace(/<[^>]*>/g, "") // Remove HTML tags
      .replace(/[<>'"&]/g, "") // Remove dangerous characters
      .substring(0, 255); // Limit length

    if (!sanitized) {
      throw new Error(`Invalid ${fieldName} format`);
    }

    return sanitized;
  }

  // ========================================
  // PRIVATE PERSISTENCE METHODS
  // ========================================

  /**
   * Persist authentication state to localStorage with security checks
   */
  private persistAuthState(state: AuthState): void {
    if (!this.localStorage) return;

    try {
      // Only persist essential data, exclude sensitive session details
      const persistedState = {
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
            }
          : null,
        session: state.session
          ? {
              // Don't persist the actual access token for security
              hasSession: true,
            }
          : null,
        isAuthenticated: state.isAuthenticated,
        timestamp: Date.now(), // Add timestamp for expiration check
      };

      // Validate data before storage
      const dataToStore = JSON.stringify(persistedState);

      // Check for potential XSS in stored data
      if (
        dataToStore.includes("<script") ||
        dataToStore.includes("javascript:")
      ) {
        console.warn("Potential XSS detected in auth state, not persisting");
        return;
      }

      this.localStorage.setItem(this.AUTH_STORAGE_KEY, dataToStore);
    } catch (error) {
      console.warn("Failed to persist auth state:", error);
      // Clear potentially corrupted state
      this.clearPersistedState();
    }
  }

  /**
   * Load persisted authentication state from localStorage with security validation
   */
  private loadPersistedState(): void {
    if (!this.localStorage) return;

    try {
      const persistedData = this.localStorage.getItem(this.AUTH_STORAGE_KEY);
      if (persistedData) {
        // Validate data structure before parsing
        if (
          persistedData.includes("<script") ||
          persistedData.includes("javascript:")
        ) {
          console.warn("Potential XSS detected in persisted auth state");
          this.clearPersistedState();
          return;
        }

        const parsedState = JSON.parse(persistedData);

        // Check if state is expired (24 hours)
        const now = Date.now();
        const stateAge = now - (parsedState.timestamp || 0);
        const MAX_STATE_AGE = 24 * 60 * 60 * 1000; // 24 hours

        if (stateAge > MAX_STATE_AGE) {
          console.log("Persisted auth state expired, clearing");
          this.clearPersistedState();
          return;
        }

        // Only load if we have valid user data
        if (
          parsedState.isAuthenticated &&
          parsedState.user &&
          parsedState.user.id &&
          parsedState.user.email
        ) {
          // Sanitize loaded user data
          const sanitizedUser = this.sanitizeUserData(parsedState.user);

          this.updateAuthState({
            user: sanitizedUser,
            session: null, // Don't restore session, will be verified
            isAuthenticated: false, // Will be verified by checkCurrentSession
            isLoading: true, // Will be updated after session check
            error: null,
          });
          console.log(
            "Loaded persisted auth state for user:",
            sanitizedUser.email,
          );
        } else {
          // Invalid persisted state, clear it
          this.clearPersistedState();
        }
      }
    } catch (error) {
      console.warn("Failed to load persisted auth state:", error);
      this.clearPersistedState();
    }
  }

  /**
   * Clear persisted authentication state
   */
  private clearPersistedState(): void {
    if (!this.localStorage) return;

    try {
      this.localStorage.removeItem(this.AUTH_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear persisted auth state:", error);
    }
  }

  // ========================================
  // CLEANUP
  // ========================================

  /**
   * Cleanup subscriptions on service destroy
   */
  ngOnDestroy(): void {
    this.authStateChangeUnsubscribe?.();
    this.clearSessionTimeout();
  }
}
