import { inject } from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { Router } from "@angular/router";
import { CanActivateFn, UrlTree } from "@angular/router";
import { Observable } from "rxjs";
import { map, take, tap } from "rxjs/operators";

import { AuthService } from "./auth.service";
import { AuthState } from "../../../types";

/**
 * Authentication guard for protecting routes that require authentication
 * Redirects unauthenticated users to login page
 * Uses the AuthService to check authentication state
 */
export const authGuard: CanActivateFn = (
  route,
  state,
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log("AuthGuard: Checking authentication for route:", state.url);

  return toObservable(authService.authState).pipe(
    take(1), // Take only the first emission to avoid infinite loops
    map((authState: AuthState) => {
      // Validate auth state integrity
      if (!authState || typeof authState !== "object") {
        console.error("AuthGuard: Invalid auth state received", authState);
        return router.createUrlTree(["/auth/login"]);
      }

      // If still loading, allow navigation but auth service will handle redirect
      if (authState.isLoading) {
        console.log("AuthGuard: Auth state is loading, allowing navigation");
        return true;
      }

      // Enhanced authentication check with user validation
      if (authState.isAuthenticated && authState.user && authState.user.id) {
        console.log(
          "AuthGuard: User is authenticated, allowing navigation to",
          state.url,
        );
        return true;
      }

      // If not authenticated, redirect to login with security logging
      console.log(
        "AuthGuard: User is not authenticated, redirecting to login from",
        state.url,
      );
      return router.createUrlTree(["/auth/login"], {
        queryParams: { returnUrl: state.url },
      });
    }),
    tap((result) => {
      // Log the guard result for debugging
      if (result instanceof UrlTree) {
        console.log("AuthGuard: Redirecting to:", result.toString());
      } else {
        console.log("AuthGuard: Navigation allowed:", result);
      }
    }),
  );
};

/**
 * Guest guard for protecting routes that should only be accessible to non-authenticated users
 * Redirects authenticated users to dashboard/sessions page
 */
export const guestGuard: CanActivateFn = (
  route,
  state,
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log("GuestGuard: Checking authentication for route:", state.url);

  return toObservable(authService.authState).pipe(
    take(1),
    map((authState: AuthState) => {
      // Validate auth state integrity
      if (!authState || typeof authState !== "object") {
        console.error("GuestGuard: Invalid auth state received", authState);
        return true; // Allow navigation to auth pages on error
      }

      // If still loading, allow navigation
      if (authState.isLoading) {
        console.log("GuestGuard: Auth state is loading, allowing navigation");
        return true;
      }

      // Enhanced check for authenticated users with user validation
      if (authState.isAuthenticated && authState.user && authState.user.id) {
        console.log(
          "GuestGuard: User is authenticated, redirecting to sessions from",
          state.url,
        );
        return router.createUrlTree(["/sessions"]);
      }

      // If not authenticated, allow navigation to auth pages
      console.log(
        "GuestGuard: User is not authenticated, allowing navigation to",
        state.url,
      );
      return true;
    }),
    tap((result) => {
      if (result instanceof UrlTree) {
        console.log("GuestGuard: Redirecting to:", result.toString());
      } else {
        console.log("GuestGuard: Navigation allowed:", result);
      }
    }),
  );
};

/**
 * Role-based guard for protecting routes based on user roles/permissions
 * Can be extended in the future for more granular access control
 */
export const roleGuard = (allowedRoles: string[] = []): CanActivateFn => {
  return (route, state): Observable<boolean | UrlTree> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    console.log(
      "RoleGuard: Checking roles for route:",
      state.url,
      "Allowed roles:",
      allowedRoles,
    );

    return toObservable(authService.authState).pipe(
      take(1),
      map((authState: AuthState) => {
        // Validate auth state integrity
        if (!authState || typeof authState !== "object") {
          console.error("RoleGuard: Invalid auth state received", authState);
          return router.createUrlTree(["/auth/login"]);
        }

        // Enhanced authentication check with user validation
        if (
          !authState.isAuthenticated ||
          !authState.user ||
          !authState.user.id
        ) {
          console.log(
            "RoleGuard: User is not authenticated, redirecting to login from",
            state.url,
          );
          return router.createUrlTree(["/auth/login"], {
            queryParams: { returnUrl: state.url },
          });
        }

        // If no roles specified, just check authentication
        if (allowedRoles.length === 0) {
          console.log(
            "RoleGuard: No specific roles required, allowing navigation for user",
            authState.user.email,
          );
          return true;
        }

        // TODO: Implement role checking when user roles are added to the system
        // For now, allow all authenticated users with enhanced logging
        console.log(
          "RoleGuard: Role checking not implemented yet, allowing navigation for authenticated user",
          authState.user.email,
          "to",
          state.url,
          "with required roles:",
          allowedRoles,
        );
        return true;

        // Future implementation:
        // const userRoles = authState.user.roles || [];
        // const hasAllowedRole = allowedRoles.some(role => userRoles.includes(role));
        //
        // if (!hasAllowedRole) {
        //   console.log('RoleGuard: User does not have required role, redirecting');
        //   return router.createUrlTree(['/unauthorized']);
        // }
        //
        // return true;
      }),
      tap((result) => {
        if (result instanceof UrlTree) {
          console.log("RoleGuard: Redirecting to:", result.toString());
        } else {
          console.log("RoleGuard: Navigation allowed:", result);
        }
      }),
    );
  };
};

/**
 * Admin guard for protecting admin-only routes
 * Shorthand for roleGuard with admin role
 */
export const adminGuard: CanActivateFn = roleGuard(["admin"]);

/**
 * Loading guard to prevent navigation during authentication loading
 * Useful for preventing race conditions during app initialization
 */
export const loadingGuard: CanActivateFn = (
  route,
  state,
): Observable<boolean> => {
  const authService = inject(AuthService);

  console.log("LoadingGuard: Checking loading state for route:", state.url);

  return toObservable(authService.authState).pipe(
    map((authState: AuthState) => {
      // Validate auth state integrity
      if (!authState || typeof authState !== "object") {
        console.error("LoadingGuard: Invalid auth state received", authState);
        return true; // Allow navigation on error to prevent blocking
      }

      return !authState.isLoading;
    }),
    tap((canActivate) => {
      console.log(
        "LoadingGuard: Can activate:",
        canActivate,
        "for route:",
        state.url,
      );
    }),
  );
};
