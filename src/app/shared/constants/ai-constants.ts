export const AI_SUMMARY = {
  API_ENDPOINT: '/functions/v1/openrouter',
  POLLING_INTERVAL: 2000,
  MAX_POLLING_ATTEMPTS: 30,
  REQUEST_TIMEOUT: 30000,
  DEBOUNCE_DELAY: 500,
} as const;

export const AI_ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_SESSION_ID: 'INVALID_SESSION_ID',
  INVALID_JSON: 'INVALID_JSON',
  UNAUTHORIZED: 'UNAUTHORIZED',
  AUTH_FAILED: 'AUTH_FAILED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  CONFIG_ERROR: 'CONFIG_ERROR',
  DB_ERROR: 'DB_ERROR',
  API_ERROR: 'API_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
} as const;

export const AI_MESSAGES = {
  GENERATING: 'Generowanie podsumowania...',
  SUCCESS: 'Podsumowanie zostało wygenerowane',
  ALREADY_GENERATING: 'Już trwa generowanie innego podsumowania',
  ERROR_GENERIC: 'Wystąpił błąd podczas generowania podsumowania',
  ERROR_NETWORK: 'Błąd połączenia. Sprawdź połączenie internetowe',
  ERROR_UNAUTHORIZED: 'Sesja wygasła. Zaloguj się ponownie',
  ERROR_SESSION_NOT_FOUND: 'Nie znaleziono sesji lub brak uprawnień',
  ERROR_TIMEOUT: 'Przekroczono czas oczekiwania. Spróbuj ponownie',
} as const;

export type AIErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES];
