import { Tables } from "./db/database.types";

// Base types from database
export type User = Pick<Tables<"users">, "auth_user_id" | "email" | "id">;
export type Exercise = Pick<Tables<"exercises">, "id" | "name">;
export type Session = Pick<
  Tables<"sessions">,
  "description" | "id" | "location" | "session_datetime" | "user_id"
>;
export type ExerciseSet = Pick<
  Tables<"exercise_sets">,
  "exercise_id" | "id" | "reps" | "session_id" | "weight"
>;

// User Profile type (alias for User)
export type UserProfile = User;

// Create DTOs (for inserting new records)
export interface CreateSessionDto {
  session_datetime: string;
  description?: string | null;
  location?: string | null;
}

// Update DTOs (for updating existing records)
export interface UpdateSessionDto {
  session_datetime?: string;
  description?: string | null;
  location?: string | null;
}

export interface CreateExerciseSetDto {
  exercise_id: number;
  session_id: number;
  reps: number;
  weight: number;
}

export interface UpdateExerciseSetDto {
  reps?: number;
  weight?: number;
}

// Extended types with additional data
export interface SessionWithStats extends Session {
  total_weight: number;
  total_reps: number;
  exercise_sets: {
    reps: number;
    weight: number;
    exercises?: {
      id: number;
      name: string;
    };
  }[];
}

export interface ExerciseSetWithExercise extends ExerciseSet {
  exercises: {
    id: number;
    name: string;
  };
}

// Auth related types
export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  access_token: string;
}

export interface AuthResponse {
  user: AuthUser;
  session: AuthSession;
}

// Database Error types
export interface DatabaseError {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

// API Error types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
}

// Pagination and query types
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// Auth form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordFormData {
  email: string;
}

export interface UpdatePasswordFormData {
  password: string;
  confirmPassword: string;
}

// Auth state for signals-based state management
export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
