import { Injectable, inject } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { DatabaseValidationService } from "./database-validation.service";
import {
  UserProfile,
  Exercise,
  Session,
  ExerciseSet,
  CreateSessionDto,
  UpdateSessionDto,
  CreateExerciseSetDto,
  UpdateExerciseSetDto,
  SessionWithStats,
  ExerciseSetWithExercise,
  AuthResponse,
  AuthUser,
  ApiError,
  DatabaseError,
  PaginationOptions,
} from "../../types";
import {
  SESSION_LIMITS,
  PAGINATION,
  DATABASE_ERROR_CODES,
  APPLICATION_ERROR_CODES,
  ERROR_MESSAGES,
  MOCK_DATA,
} from "../constants";

/**
 * Database service - wrapper/adapter for database operations
 * Provides business logic layer over SupabaseService
 * Allows easy switching to different database providers in the future
 */
@Injectable({
  providedIn: "root",
})
export class DbService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly databaseValidationService = inject(
    DatabaseValidationService,
  );

  // ========================================
  // AUTHENTICATION SERVICE (MOCKS)
  // ========================================

  /**
   * Mock: Sign up a new user with email and password
   * TODO: Implement actual authentication logic
   */
  async signUp(email: string): Promise<AuthResponse> {
    // Mock implementation
    return {
      user: { id: MOCK_DATA.USER_ID, email },
      session: { access_token: MOCK_DATA.ACCESS_TOKEN },
    };
  }

  /**
   * Mock: Sign in user with email and password
   * TODO: Implement actual authentication logic
   */
  async signIn(email: string): Promise<AuthResponse> {
    // Mock implementation
    return {
      user: { id: MOCK_DATA.USER_ID, email },
      session: { access_token: MOCK_DATA.ACCESS_TOKEN },
    };
  }

  /**
   * Mock: Sign out the current user
   * TODO: Implement actual authentication logic
   */
  async signOut(): Promise<void> {
    // Mock implementation
    console.log("User signed out (mock)");
  }

  /**
   * Mock: Get the currently authenticated user
   * TODO: Implement actual authentication logic
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    // Mock implementation
    return { id: MOCK_DATA.USER_ID, email: MOCK_DATA.USER_EMAIL };
  }

  /**
   * Mock: Get current user's internal ID from the users table
   * TODO: Implement actual user profile retrieval
   */
  private async getCurrentUserId(): Promise<number> {
    // Mock implementation - returns a fixed user ID
    return MOCK_DATA.INTERNAL_USER_ID;
  }

  // ========================================
  // USER PROFILE SERVICE
  // ========================================

  /**
   * Get the current user's profile
   * @returns Promise with user profile data
   * @throws Error if profile retrieval fails
   */
  async getUserProfile(): Promise<UserProfile> {
    try {
      return await this.supabaseService.getUserProfile();
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  // ========================================
  // EXERCISES SERVICE
  // ========================================

  /**
   * Get all available exercises
   * @returns Promise with array of exercises ordered by name
   * @throws Error if retrieval fails
   */
  async getAllExercises(): Promise<Exercise[]> {
    try {
      return await this.supabaseService.getAllExercises();
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  // ========================================
  // SESSIONS SERVICE
  // ========================================

  /**
   * Get user sessions with pagination and statistics
   * @param options - Pagination options (page, limit)
   * @returns Promise with array of sessions with calculated stats
   * @throws Error if retrieval fails
   */
  async getSessions(
    options: PaginationOptions = {
      page: PAGINATION.DEFAULT_PAGE,
      limit: PAGINATION.DEFAULT_SESSIONS_LIMIT,
    },
  ): Promise<SessionWithStats[]> {
    try {
      // Validate pagination options
      this.databaseValidationService.validatePaginationOptions(options);

      return await this.supabaseService.getSessions(options);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Get session by ID with full details including exercise sets
   * @param id - Session ID
   * @returns Promise with session data including statistics
   * @throws Error if session not found or retrieval fails
   */
  async getSessionById(id: number): Promise<SessionWithStats> {
    try {
      // Validate session ID
      this.databaseValidationService.validateId(id, "Session ID");

      return await this.supabaseService.getSessionById(id);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Create a new training session
   * Validates daily session limit before creation
   * @param session - Session data to create
   * @returns Promise with created session
   * @throws Error if daily limit exceeded or creation fails
   */
  async createSession(session: CreateSessionDto): Promise<Session> {
    try {
      // Validate session data format and constraints
      this.databaseValidationService.validateSessionData(session);

      // Validate daily session limit (business logic requiring DB check)
      await this.validateDailySessionLimit(session.session_datetime);

      const userId = await this.getCurrentUserId();
      return await this.supabaseService.createSession(session, userId);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Update an existing session
   * @param id - Session ID to update
   * @param updates - Partial session data to update
   * @returns Promise with updated session
   * @throws Error if update fails
   */
  async updateSession(id: number, updates: UpdateSessionDto): Promise<Session> {
    try {
      // Validate session ID
      this.databaseValidationService.validateId(id, "Session ID");

      // Validate session data format and constraints if provided
      this.databaseValidationService.validateSessionData(updates);

      return await this.supabaseService.updateSession(id, updates);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Delete a session and all associated exercise sets
   * @param id - Session ID to delete
   * @throws Error if deletion fails
   */
  async deleteSession(id: number): Promise<void> {
    try {
      // Validate session ID
      this.databaseValidationService.validateId(id, "Session ID");

      await this.supabaseService.deleteSession(id);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Validate that user hasn't exceeded daily session limit (3 sessions per day)
   * @param sessionDateTime - Date/time of the session to validate
   * @throws Error if daily limit would be exceeded
   */
  private async validateDailySessionLimit(
    sessionDateTime: string,
  ): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const dailyCount = await this.supabaseService.getDailySessionCount(
        userId,
        sessionDateTime,
      );

      if (dailyCount >= SESSION_LIMITS.MAX_DAILY_SESSIONS) {
        throw new Error(ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED);
      }
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  // ========================================
  // EXERCISE SETS SERVICE
  // ========================================

  /**
   * Get exercise sets for a specific session with pagination
   * @param sessionId - Session ID to get sets for
   * @param options - Pagination options (page, limit)
   * @returns Promise with array of exercise sets including exercise details
   * @throws Error if retrieval fails
   */
  async getSessionSets(
    sessionId: number,
    options: PaginationOptions = {
      page: PAGINATION.DEFAULT_PAGE,
      limit: PAGINATION.DEFAULT_SETS_LIMIT,
    },
  ): Promise<ExerciseSetWithExercise[]> {
    try {
      // Validate session ID and pagination options
      this.databaseValidationService.validateId(sessionId, "Session ID");
      this.databaseValidationService.validatePaginationOptions(options);

      return await this.supabaseService.getSessionSets(sessionId, options);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Create a new exercise set
   * Validates session sets limit before creation
   * @param set - Exercise set data to create
   * @returns Promise with created exercise set
   * @throws Error if session sets limit exceeded or creation fails
   */
  async createExerciseSet(set: CreateExerciseSetDto): Promise<ExerciseSet> {
    try {
      // Validate exercise set data format and constraints
      this.databaseValidationService.validateExerciseSetData(set);

      // Validate session sets limit (business logic requiring DB check)
      await this.validateSessionSetsLimit(set.session_id);

      return await this.supabaseService.createExerciseSet(set);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Update an existing exercise set
   * @param id - Exercise set ID to update
   * @param updates - Partial exercise set data to update
   * @returns Promise with updated exercise set
   * @throws Error if update fails
   */
  async updateExerciseSet(
    id: number,
    updates: UpdateExerciseSetDto,
  ): Promise<ExerciseSet> {
    try {
      // Validate exercise set ID
      this.databaseValidationService.validateId(id, "Exercise Set ID");

      // Validate exercise set data format and constraints if provided
      this.databaseValidationService.validateExerciseSetData(updates);

      return await this.supabaseService.updateExerciseSet(id, updates);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Delete an exercise set
   * @param id - Exercise set ID to delete
   * @throws Error if deletion fails
   */
  async deleteExerciseSet(id: number): Promise<void> {
    try {
      // Validate exercise set ID
      this.databaseValidationService.validateId(id, "Exercise Set ID");

      await this.supabaseService.deleteExerciseSet(id);
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Validate that session hasn't exceeded sets limit (50 sets per session)
   * @param sessionId - Session ID to validate
   * @throws Error if session sets limit would be exceeded
   */
  private async validateSessionSetsLimit(sessionId: number): Promise<void> {
    try {
      // No need to validate sessionId here, it's validated in the calling methods (getSessionSets, createExerciseSet)

      const setsCount =
        await this.supabaseService.getSessionSetsCount(sessionId);

      if (setsCount >= SESSION_LIMITS.MAX_SETS_PER_SESSION) {
        throw new Error(ERROR_MESSAGES.SETS_LIMIT_EXCEEDED);
      }
    } catch (error) {
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Validate session data fields
   * @param session - Session data to validate (partial or full)
   * @throws Error if validation fails
   */
  // Note: validateSessionData moved to DatabaseValidationService

  /**
   * Validate exercise set data fields (reps, weight).
   * Checks against defined range limits.
   * @param set - Exercise set data to validate (partial or full).
   * @throws Error if validation fails.
   */
  // Note: validateExerciseSetData moved to DatabaseValidationService

  // ========================================
  // ERROR HANDLING
  // ========================================

  /**
   * Handle and transform database errors into application-specific errors
   * @param error - Original error from database operations
   * @returns Transformed ApiError with appropriate message and code
   */
  private handleDatabaseError(error: unknown): ApiError {
    const dbError = error as DatabaseError;

    // Handle specific database error codes
    if (dbError?.code === DATABASE_ERROR_CODES.UNIQUE_VIOLATION) {
      return {
        message: ERROR_MESSAGES.DUPLICATE_ENTRY,
        code: APPLICATION_ERROR_CODES.DUPLICATE,
      };
    }

    if (dbError?.message?.includes("Daily session limit")) {
      return {
        message: ERROR_MESSAGES.DAILY_LIMIT_EXCEEDED,
        code: APPLICATION_ERROR_CODES.DAILY_LIMIT,
      };
    }

    if (dbError?.message?.includes("Session sets limit")) {
      return {
        message: ERROR_MESSAGES.SETS_LIMIT_EXCEEDED,
        code: APPLICATION_ERROR_CODES.SETS_LIMIT,
      };
    }

    // Handle authentication errors (for future implementation)
    if (dbError?.message?.includes("Invalid login credentials")) {
      return {
        message: ERROR_MESSAGES.INVALID_CREDENTIALS,
        code: APPLICATION_ERROR_CODES.INVALID_CREDENTIALS,
      };
    }

    if (dbError?.message?.includes("User already registered")) {
      return {
        message: ERROR_MESSAGES.USER_EXISTS,
        code: APPLICATION_ERROR_CODES.USER_EXISTS,
      };
    }

    // Default error handling
    return {
      message: dbError?.message || ERROR_MESSAGES.UNEXPECTED_ERROR,
      code: dbError?.code,
    };
  }
}
