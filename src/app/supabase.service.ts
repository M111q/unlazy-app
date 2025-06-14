import { Injectable, inject } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { environment } from "../environments/environment";
import type { Database } from "../db/database.types";
import { UtilService } from "./util.service";
import { PAGINATION } from "./constants";
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
} from "../types";

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
          weight
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
    const { data, error } = await this.supabase
      .from("sessions")
      .insert([
        {
          user_id: userId,
          session_datetime: session.session_datetime,
          description: session.description,
          location: session.location,
        },
      ])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
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
