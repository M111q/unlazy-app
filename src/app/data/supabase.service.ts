import { Injectable, inject } from "@angular/core";
import {
  createClient,
  SupabaseClient,
  AuthChangeEvent,
  Session as SupabaseSession,
} from "@supabase/supabase-js";
import { environment } from "../../environments/environment";
import type { Database } from "../../db/database.types";
import { UtilService } from "../utils/util.service";
import { PAGINATION } from "../constants";
import {
  Exercise,
  Session,
  ExerciseSet,
  SessionWithStats,
  ExerciseSetWithExercise,
  CreateSessionDto,
  UpdateSessionDto,
  CreateExerciseSetDto,
  UpdateExerciseSetDto,
  UserProfile,
  PaginationOptions,
  AuthResponse,
  AuthUser,
} from "../../types";

@Injectable({
  providedIn: "root", // Makes the service a singleton and available throughout the app
})
export class SupabaseService {
  private supabase: SupabaseClient<Database>;
  private readonly utilService = inject(UtilService);

  constructor() {
    if (!environment.supabaseUrl || !environment.supabaseKey) {
      console.error("Supabase URL or Key not found in environment variables.");
      throw new Error("Supabase environment variables not configured.");
    }

    this.supabase = createClient<Database>(
      environment.supabaseUrl,
      environment.supabaseKey,
    );
  }

  get client(): SupabaseClient<Database> {
    return this.supabase;
  }

  // ========================================
  // AUTHENTICATION OPERATIONS
  // ========================================

  /**
   * Sign up a new user with email and password
   * @param email - User email address
   * @param password - User password
   * @returns Promise with authentication response
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw new Error(error.message);

    if (!data.user || !data.session) {
      throw new Error("Registration failed - no user or session returned");
    }

    // Create user profile in public.users table
    try {
      await this.createUserProfile(data.user.id, data.user.email || email);
    } catch (profileError) {
      console.error("Failed to create user profile:", profileError);
      // Don't throw here - the auth user was created successfully
      // The profile creation will be retried on next login if needed
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || email,
      },
      session: {
        access_token: data.session.access_token,
      },
    };
  }

  /**
   * Sign in user with email and password
   * @param email - User email address
   * @param password - User password
   * @returns Promise with authentication response
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw new Error(error.message);

    if (!data.user || !data.session) {
      throw new Error("Login failed - no user or session returned");
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email || email,
      },
      session: {
        access_token: data.session.access_token,
      },
    };
  }

  /**
   * Sign out the current user
   * @returns Promise that resolves when sign out is complete
   */
  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }

  /**
   * Send password reset email to user
   * @param email - User email address
   * @returns Promise that resolves when reset email is sent
   */
  async resetPassword(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) throw new Error(error.message);
  }

  /**
   * Get the currently authenticated user
   * @returns Promise with current user or null if not authenticated
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data, error } = await this.supabase.auth.getUser();

      if (error) {
        console.error("Error getting current user:", error.message);

        // Don't return null immediately for network errors - they might be temporary
        if (
          error.message?.includes("network") ||
          error.message?.includes("timeout")
        ) {
          console.warn(
            "Temporary network error getting user, retrying once...",
          );

          // Retry once after a brief delay
          await new Promise((resolve) => setTimeout(resolve, 200));

          try {
            const { data: retryData, error: retryError } =
              await this.supabase.auth.getUser();

            if (retryError) {
              console.error(
                "Retry failed for getCurrentUser:",
                retryError.message,
              );
              return null;
            }

            if (!retryData.user) {
              return null;
            }

            return {
              id: retryData.user.id,
              email: retryData.user.email || "",
            };
          } catch (retryException) {
            console.error(
              "Exception during getCurrentUser retry:",
              retryException,
            );
            return null;
          }
        }

        return null;
      }

      if (!data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email || "",
      };
    } catch (exception) {
      console.error("Exception in getCurrentUser:", exception);
      return null;
    }
  }

  /**
   * Listen to authentication state changes
   * @param callback - Function to call when auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: SupabaseSession | null) => void,
  ): () => void {
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange(callback);

    return () => {
      subscription.unsubscribe();
    };
  }

  /**
   * Get current user's internal ID from the users table
   * @returns Promise with internal user ID
   * @throws Error if user not found or not authenticated
   */
  async getCurrentUserId(): Promise<number> {
    console.log("SupabaseService: Getting current user ID...");

    const currentUser = await this.getCurrentUser();
    if (!currentUser) {
      console.error("SupabaseService: No current user found");
      throw new Error("User not authenticated");
    }

    console.log("SupabaseService: Current user found:", currentUser.email);

    try {
      const { data, error } = await this.supabase
        .from("users")
        .select("id")
        .eq("auth_user_id", currentUser.id)
        .single();

      if (error) {
        console.error("SupabaseService: Error getting user profile:", error);

        // If user profile doesn't exist, create it
        if (error.code === "PGRST116") {
          console.log("User profile not found, creating it...");
          try {
            const newProfile = await this.createUserProfile(
              currentUser.id,
              currentUser.email,
            );
            console.log(
              "SupabaseService: New profile created with ID:",
              newProfile.id,
            );
            return newProfile.id;
          } catch (createError) {
            console.error("Failed to create user profile:", createError);
            throw new Error("User profile not found and could not be created");
          }
        }
        throw new Error(error.message);
      }

      if (!data) {
        console.error(
          "SupabaseService: No data returned from user profile query",
        );
        throw new Error("User profile not found");
      }

      console.log("SupabaseService: User ID found:", data.id);
      return data.id;
    } catch (exception) {
      console.error(
        "SupabaseService: Exception in getCurrentUserId:",
        exception,
      );
      throw exception;
    }
  }

  // ========================================
  // EXERCISES OPERATIONS
  // ========================================

  async getAllExercises(): Promise<Exercise[]> {
    const { data, error } = await this.supabase
      .from("exercises")
      .select("*")
      .order("name");

    if (error) throw new Error(error.message);
    return data || [];
  }

  // ========================================
  // USER PROFILE OPERATIONS
  // ========================================

  async getUserProfile(): Promise<UserProfile> {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Create user profile in public.users table after successful registration
   * @param authUserId - Auth user ID from auth.users
   * @param email - User email address
   * @returns Promise with created user profile
   */
  async createUserProfile(
    authUserId: string,
    email: string,
  ): Promise<UserProfile> {
    console.log("Creating user profile:", { authUserId, email });

    const { data, error } = await this.supabase
      .from("users")
      .insert([
        {
          auth_user_id: authUserId,
          email: email,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating user profile:", error);
      throw new Error(error.message);
    }

    if (!data) {
      throw new Error("No data returned from user profile creation");
    }

    console.log("User profile created successfully:", data);
    return data;
  }

  // ========================================
  // SESSIONS OPERATIONS
  // ========================================

  async getSessions(
    options: PaginationOptions = {},
  ): Promise<SessionWithStats[]> {
    const page = options.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = options.limit ?? PAGINATION.DEFAULT_SESSIONS_LIMIT;
    const offset = page * limit;

    const { data, error } = await this.supabase
      .from("sessions")
      .select(
        `
        *,
        exercise_sets (
          reps,
          weight,
          exercises (
            id,
            name
          )
        )
      `,
      )
      .order("session_datetime", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);

    // Calculate statistics
    return (
      data?.map((session) => ({
        ...session,
        total_weight: session.exercise_sets.reduce(
          (sum, set) => sum + set.weight,
          0,
        ),
        total_reps: session.exercise_sets.reduce(
          (sum, set) => sum + set.reps,
          0,
        ),
      })) || []
    );
  }

  async getSessionById(id: number): Promise<SessionWithStats> {
    const { data, error } = await this.supabase
      .from("sessions")
      .select(
        `
        *,
        exercise_sets (
          id,
          reps,
          weight,
          exercises (
            id,
            name
          )
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw new Error(error.message);

    return {
      ...data,
      total_weight: data.exercise_sets.reduce(
        (sum, set) => sum + set.weight,
        0,
      ),
      total_reps: data.exercise_sets.reduce((sum, set) => sum + set.reps, 0),
    };
  }

  async createSession(
    session: CreateSessionDto,
    userId: number,
  ): Promise<Session> {
    // Validate userId
    if (!userId || userId <= 0) {
      throw new Error("Invalid user ID provided");
    }

    const insertData = {
      user_id: userId,
      session_datetime: session.session_datetime,
      description: session.description,
      location: session.location,
    };

    const { data, error } = await this.supabase
      .from("sessions")
      .insert([insertData])
      .select();

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      throw new Error("No data returned from insert operation");
    }

    return data[0];
  }

  async updateSession(id: number, updates: UpdateSessionDto): Promise<Session> {
    const { data, error } = await this.supabase
      .from("sessions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteSession(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("sessions")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  async getDailySessionCount(
    userId: number,
    sessionDateTime: string,
  ): Promise<number> {
    const startOfDay = this.utilService.getStartOfDay(sessionDateTime);
    const endOfDay = this.utilService.getEndOfDay(sessionDateTime);

    const { count, error } = await this.supabase
      .from("sessions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .gte("session_datetime", startOfDay)
      .lte("session_datetime", endOfDay);

    if (error) throw new Error(error.message);
    return count || 0;
  }

  // ========================================
  // EXERCISE SETS OPERATIONS
  // ========================================

  async getSessionSets(
    sessionId: number,
    options: PaginationOptions = {},
  ): Promise<ExerciseSetWithExercise[]> {
    const page = options.page ?? PAGINATION.DEFAULT_PAGE;
    const limit = options.limit ?? PAGINATION.DEFAULT_SETS_LIMIT;
    const offset = page * limit;

    const { data, error } = await this.supabase
      .from("exercise_sets")
      .select(
        `
        *,
        exercises (
          id,
          name
        )
      `,
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return data || [];
  }

  async createExerciseSet(set: CreateExerciseSetDto): Promise<ExerciseSet> {
    const { data, error } = await this.supabase
      .from("exercise_sets")
      .insert([set])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async updateExerciseSet(
    id: number,
    updates: UpdateExerciseSetDto,
  ): Promise<ExerciseSet> {
    const { data, error } = await this.supabase
      .from("exercise_sets")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async deleteExerciseSet(id: number): Promise<void> {
    const { error } = await this.supabase
      .from("exercise_sets")
      .delete()
      .eq("id", id);

    if (error) throw new Error(error.message);
  }

  async getSessionSetsCount(sessionId: number): Promise<number> {
    const { count, error } = await this.supabase
      .from("exercise_sets")
      .select("*", { count: "exact" })
      .eq("session_id", sessionId);

    if (error) throw new Error(error.message);
    return count || 0;
  }
}
