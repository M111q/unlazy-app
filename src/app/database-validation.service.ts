import { Injectable } from "@angular/core";
import {
  CreateSessionDto,
  UpdateSessionDto,
  CreateExerciseSetDto,
  UpdateExerciseSetDto,
  PaginationOptions,
} from "../types";
import {
  FIELD_LIMITS,
  EXERCISE_SET_LIMITS,
  ERROR_MESSAGES,
  PAGINATION,
} from "./constants";

/**
 * Service responsible for validating data structures and parameters
 * before interacting with the database layer (SupabaseService).
 * Contains business logic validation rules.
 */
@Injectable({
  providedIn: "root",
})
export class DatabaseValidationService {
  /**
   * Validate session data fields (description, location).
   * Checks against defined field limits.
   * @param session - Session data to validate (partial or full).
   * @throws Error if validation fails.
   */
  validateSessionData(session: CreateSessionDto | UpdateSessionDto): void {
    if (session.description !== undefined && session.description !== null) {
      if (session.description.length > FIELD_LIMITS.DESCRIPTION_MAX_LENGTH) {
        throw new Error(ERROR_MESSAGES.DESCRIPTION_TOO_LONG);
      }
    }

    if (session.location !== undefined && session.location !== null) {
      if (session.location.length > FIELD_LIMITS.LOCATION_MAX_LENGTH) {
        throw new Error(ERROR_MESSAGES.LOCATION_TOO_LONG);
      }
    }
  }

  /**
   * Validate exercise set data fields (reps, weight).
   * Checks against defined range limits.
   * @param set - Exercise set data to validate (partial or full).
   * @throws Error if validation fails.
   */
  validateExerciseSetData(
    set: CreateExerciseSetDto | UpdateExerciseSetDto,
  ): void {
    if ("reps" in set && set.reps !== undefined) {
      if (set.reps < EXERCISE_SET_LIMITS.REPS_MIN || set.reps > EXERCISE_SET_LIMITS.REPS_MAX) {
        throw new Error(ERROR_MESSAGES.REPS_OUT_OF_RANGE);
      }
    }

    if ("weight" in set && set.weight !== undefined) {
      if (set.weight < EXERCISE_SET_LIMITS.WEIGHT_MIN || set.weight > EXERCISE_SET_LIMITS.WEIGHT_MAX) {
        throw new Error(ERROR_MESSAGES.WEIGHT_OUT_OF_RANGE);
      }
    }
  }

  /**
   * Validate a numeric ID parameter.
   * Checks if the ID is a positive integer.
   * @param id - The ID value to validate.
   * @param paramName - The name of the parameter being validated (for error messages).
   * @throws Error if the ID is not a positive integer.
   */
  validateId(id: number, paramName: string): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid ${paramName}: must be a positive integer`);
    }
  }

  /**
   * Validate pagination options.
   * Checks if page is non-negative and limit is positive.
   * @param options - The pagination options object.
   * @throws Error if pagination options are invalid.
   */
  validatePaginationOptions(options: PaginationOptions): void {
    if (options.page !== undefined && (!Number.isInteger(options.page) || options.page < 0)) {
       throw new Error("Invalid pagination option 'page': must be a non-negative integer");
    }
    if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
       throw new Error("Invalid pagination option 'limit': must be a positive integer");
    }
  }
}
