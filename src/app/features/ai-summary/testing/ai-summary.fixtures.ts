import { User, Session, GenerateSummaryAsyncResponse } from "../../../../types";

/**
 * Test fixtures and mock data for AI Summary testing
 */

// Mock Users
export const mockUsers = {
  validUser: {
    id: 1,
    auth_user_id: "auth-user-1",
    email: "test@example.com",
    generating_started_at: null,
  } as User,

  generatingUser: {
    id: 2,
    auth_user_id: "auth-user-2",
    email: "generating@example.com",
    generating_started_at: new Date().toISOString(),
  } as User,

  unauthorizedUser: {
    id: 3,
    auth_user_id: "auth-user-3",
    email: "unauthorized@example.com",
    generating_started_at: null,
  } as User,
};

// Mock Sessions
export const mockSessions = {
  validSession: {
    id: 1,
    user_id: 1,
    description: "Test session",
    location: "Gym",
    session_datetime: new Date().toISOString(),
    summary: null,
  } as Session,

  sessionWithSummary: {
    id: 2,
    user_id: 1,
    description: "Session with summary",
    location: "Home",
    session_datetime: new Date().toISOString(),
    summary: "This is an existing AI summary",
  } as Session,

  unauthorizedSession: {
    id: 3,
    user_id: 999, // Different user_id
    description: "Unauthorized session",
    location: "Gym",
    session_datetime: new Date().toISOString(),
    summary: null,
  } as Session,

  invalidSession: null,
};

// Mock API Responses
export const mockApiResponses = {
  successResponse: {
    data: {
      requestId: "req-123",
      status: "started",
      sessionId: 1,
    } as GenerateSummaryAsyncResponse,
    error: null,
  },

  errorResponse: {
    data: null,
    error: {
      message: "API Error occurred",
    },
  },

  timeoutError: new Error("TimeoutError"),

  networkError: new Error("Network error - fetch failed"),

  unauthorizedError: new Error("401 - Unauthorized access"),

  notFoundError: new Error("404 - Session not found"),

  malformedResponse: {
    data: {
      status: "error",
      error: "Malformed response error",
    } as GenerateSummaryAsyncResponse,
    error: null,
  },
};

// Mock DbService
export const createMockDbService = () => {
  return {
    getCurrentUserWithAIStatus: jasmine.createSpy("getCurrentUserWithAIStatus"),
    getSession: jasmine.createSpy("getSession"),
    callEdgeFunction: jasmine.createSpy("callEdgeFunction"),
  };
};

// Mock MatSnackBar
export const createMockSnackBar = () => {
  return {
    open: jasmine.createSpy("open"),
  };
};

// Test Scenarios Data
export const testScenarios = {
  // Valid generation scenarios
  validGeneration: {
    sessionId: 1,
    user: mockUsers.validUser,
    session: mockSessions.validSession,
    expectedApiCall: {
      functionName: "openrouter",
      payload: { sessionId: 1 },
    },
  },

  // Invalid generation scenarios
  invalidSessionId: {
    sessionId: 999,
    user: mockUsers.validUser,
    session: null,
  },

  userAlreadyGenerating: {
    sessionId: 1,
    user: mockUsers.generatingUser,
    session: mockSessions.validSession,
  },

  sessionWithExistingSummary: {
    sessionId: 2,
    user: mockUsers.validUser,
    session: mockSessions.sessionWithSummary,
  },

  unauthorizedAccess: {
    sessionId: 3,
    user: mockUsers.validUser,
    session: mockSessions.unauthorizedSession,
  },

  // Error scenarios
  databaseError: {
    sessionId: 1,
    user: null,
    session: null,
    error: new Error("Database connection failed"),
  },

  apiTimeout: {
    sessionId: 1,
    user: mockUsers.validUser,
    session: mockSessions.validSession,
    error: mockApiResponses.timeoutError,
  },

  networkFailure: {
    sessionId: 1,
    user: mockUsers.validUser,
    session: mockSessions.validSession,
    error: mockApiResponses.networkError,
  },
};

// Helper Functions for Test Setup
export const setupMockDbService = (mockDbService: any, scenario: any) => {
  if (scenario.user !== undefined) {
    mockDbService.getCurrentUserWithAIStatus.and.returnValue(
      Promise.resolve(scenario.user),
    );
  }

  if (scenario.session !== undefined) {
    mockDbService.getSession.and.returnValue(Promise.resolve(scenario.session));
  }

  if (scenario.error && scenario.error.name === "TimeoutError") {
    const timeoutError = new Error("Request timeout");
    timeoutError.name = "TimeoutError";
    mockDbService.callEdgeFunction.and.returnValue(
      Promise.reject(timeoutError),
    );
  } else if (scenario.error) {
    mockDbService.callEdgeFunction.and.returnValue(
      Promise.reject(scenario.error),
    );
  } else {
    mockDbService.callEdgeFunction.and.returnValue(
      Promise.resolve(mockApiResponses.successResponse),
    );
  }
};

// Expected Messages for Testing
export const expectedMessages = {
  generating: "Generowanie podsumowania...", // This should match AI_MESSAGES.GENERATING
  errorGeneric: "Wystąpił błąd podczas generowania podsumowania", // Generic error
  errorTimeout: "Przekroczono czas oczekiwania. Spróbuj ponownie", // Timeout error
  errorNetwork: "Błąd połączenia. Sprawdź połączenie internetowe", // Network error
  errorUnauthorized: "Sesja wygasła. Zaloguj się ponownie", // Unauthorized
  errorSessionNotFound: "Nie znaleziono sesji lub brak uprawnień", // Session not found
  alreadyGenerating: "Już trwa generowanie innego podsumowania", // Already generating
};
