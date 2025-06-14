/**
 * Application constants
 * Contains all magic numbers and string constants used across the application
 */

// ========================================
// BUSINESS LOGIC LIMITS
// ========================================

export const SESSION_LIMITS = {
  /** Maximum number of sessions per day */
  MAX_DAILY_SESSIONS: 3,
  /** Maximum number of exercise sets per session */
  MAX_SETS_PER_SESSION: 50,
} as const;

export const FIELD_LIMITS = {
  /** Maximum length for session description */
  DESCRIPTION_MAX_LENGTH: 260,
  /** Maximum length for session location */
  LOCATION_MAX_LENGTH: 160,
} as const;

export const EXERCISE_SET_LIMITS = {
  /** Minimum number of repetitions */
  REPS_MIN: 1,
  /** Maximum number of repetitions */
  REPS_MAX: 300,
  /** Minimum weight value */
  WEIGHT_MIN: 1,
  /** Maximum weight value */
  WEIGHT_MAX: 400,
} as const;

// ========================================
// PAGINATION DEFAULTS
// ========================================

export const PAGINATION = {
  /** Default number of sessions per page */
  DEFAULT_SESSIONS_LIMIT: 10,
  /** Default number of exercise sets per page */
  DEFAULT_SETS_LIMIT: 20,
  /** Default starting page (0-based) */
  DEFAULT_PAGE: 0,
} as const;

// ========================================
// ERROR CODES
// ========================================

export const DATABASE_ERROR_CODES = {
  /** PostgreSQL unique constraint violation */
  UNIQUE_VIOLATION: '23505',
} as const;

export const APPLICATION_ERROR_CODES = {
  /** Generic duplicate entry error */
  DUPLICATE: 'DUPLICATE',
  /** Daily session limit exceeded */
  DAILY_LIMIT: 'DAILY_LIMIT',
  /** Session sets limit exceeded */
  SETS_LIMIT: 'SETS_LIMIT',
  /** Invalid authentication credentials */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /** User already exists */
  USER_EXISTS: 'USER_EXISTS',
} as const;

// ========================================
// ERROR MESSAGES
// ========================================

export const ERROR_MESSAGES = {
  // Session validation messages
  DESCRIPTION_TOO_LONG: `Description cannot exceed ${FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
  LOCATION_TOO_LONG: `Location cannot exceed ${FIELD_LIMITS.LOCATION_MAX_LENGTH} characters`,
  DAILY_LIMIT_EXCEEDED: `Daily session limit exceeded (maximum ${SESSION_LIMITS.MAX_DAILY_SESSIONS} sessions per day)`,

  // Exercise set validation messages
  REPS_OUT_OF_RANGE: `Reps must be between ${EXERCISE_SET_LIMITS.REPS_MIN} and ${EXERCISE_SET_LIMITS.REPS_MAX}`,
  WEIGHT_OUT_OF_RANGE: `Weight must be between ${EXERCISE_SET_LIMITS.WEIGHT_MIN} and ${EXERCISE_SET_LIMITS.WEIGHT_MAX}`,
  SETS_LIMIT_EXCEEDED: `Session sets limit exceeded (maximum ${SESSION_LIMITS.MAX_SETS_PER_SESSION} sets per session)`,

  // General error messages
  DUPLICATE_ENTRY: 'Duplicate entry detected',
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_EXISTS: 'User with this email already exists',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
} as const;

// ========================================
// MOCK DATA (for development)
// ========================================

export const MOCK_DATA = {
  USER_ID: 'mock-user-id',
  USER_EMAIL: 'mock@example.com',
  ACCESS_TOKEN: 'mock-token',
  INTERNAL_USER_ID: 1,
} as const;
