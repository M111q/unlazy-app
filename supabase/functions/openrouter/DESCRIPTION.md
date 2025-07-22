# Session Summary API - Dokumentacja

## Opis

Edge Function generująca podsumowanie sesji treningowej przy użyciu AI w trybie asynchronicznym. Funkcja pobiera dane o sesji treningowej użytkownika, rozpoczyna generowanie w tle i natychmiast zwraca odpowiedź. Podsumowanie jest generowane w języku polskim i zapisywane bezpośrednio w bazie danych.

## Endpoint

```
POST /functions/v1/openrouter
```

## Autoryzacja

Wymagany token JWT w nagłówku Authorization:

```
Authorization: Bearer <JWT_TOKEN>
```

Token musi być ważnym tokenem Supabase Auth dla zalogowanego użytkownika.

## Format danych wejściowych

### Request Body

```typescript
{
  "sessionId": number  // ID sesji treningowej do podsumowania
}
```

### Przykład

```json
{
  "sessionId": 123
}
```

### Walidacja

- `sessionId` jest wymagane
- Musi być liczbą całkowitą dodatnią
- Sesja musi należeć do zalogowanego użytkownika
- Sesja musi zawierać przynajmniej jedno ćwiczenie

## Format danych wyjściowych

### Sukces (200 OK)

```typescript
{
  "requestId": string,    // Unikalny identyfikator żądania
  "status": "started" | "generating" | "completed" | "error",  // Status generowania
  "sessionId": number,    // ID sesji do podsumowania
  "summary"?: string,     // Podsumowanie (tylko gdy status = "completed")
  "tokensUsed"?: number,  // Liczba tokenów (tylko gdy status = "completed")
  "error"?: string        // Komunikat błędu (tylko gdy status = "error")
}
```

### Przykład odpowiedzi (rozpoczęcie generowania)

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "started",
  "sessionId": 123
}
```

### Przykład odpowiedzi (błąd podczas generowania)

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "error",
  "sessionId": 123,
  "error": "Failed to generate summary"
}
```

## Obsługa błędów

### Format błędu

```typescript
{
  "error": string,  // Opis błędu
  "code": string    // Kod błędu do obsługi w aplikacji
}
```

### Kody błędów

| Status | Code | Opis |
|--------|------|------|
| 400 | `INVALID_REQUEST` | Brak sessionId lub nieprawidłowy typ danych |
| 400 | `INVALID_SESSION_ID` | sessionId nie jest dodatnią liczbą całkowitą |
| 400 | `INVALID_JSON` | Nieprawidłowy format JSON w request body |
| 401 | `UNAUTHORIZED` | Brak lub nieprawidłowy nagłówek Authorization |
| 401 | `AUTH_FAILED` | Token JWT jest nieprawidłowy lub wygasł |
| 404 | `USER_NOT_FOUND` | Użytkownik nie został znaleziony w bazie |
| 404 | `SESSION_NOT_FOUND` | Sesja nie istnieje, nie należy do użytkownika lub jest pusta |
| 405 | `METHOD_NOT_ALLOWED` | Użyto innej metody niż POST |
| 500 | `CONFIG_ERROR` | Błąd konfiguracji serwisu |
| 500 | `DB_ERROR` | Błąd połączenia z bazą danych |
| 500 | `API_ERROR` | Błąd generowania podsumowania |
| 500 | `INTERNAL_ERROR` | Nieznany błąd serwera |

### Przykłady błędów

#### Brak autoryzacji (401)
```json
{
  "error": "Missing or invalid authorization header",
  "code": "UNAUTHORIZED"
}
```

#### Sesja nie znaleziona (404)
```json
{
  "error": "Session not found or access denied",
  "code": "SESSION_NOT_FOUND"
}
```

#### Nieprawidłowe dane (400)
```json
{
  "error": "sessionId is required and must be a number",
  "code": "INVALID_REQUEST"
}
```

## Ograniczenia

### Wymagania sesji
- Sesja musi należeć do zalogowanego użytkownika
- Sesja musi zawierać przynajmniej jedno ćwiczenie
- Puste sesje (bez ćwiczeń) zwracają błąd 404

### Limity techniczne
- Maksymalny czas odpowiedzi: 30 sekund
- Maksymalna długość podsumowania: ~200 tokenów
- Model AI: `deepseek/deepseek-chat-v3-0324:free`

### Język
- Podsumowania są generowane wyłącznie w języku polskim
- W przyszłości możliwe będzie dostosowanie języka per użytkownik


## Mechanizm blokowania

Funkcja implementuje mechanizm blokowania wielokrotnego generowania:

1. **Flaga `generating_started_at`**: Ustawiana w tabeli `users` przy rozpoczęciu generowania
2. **Blokowanie**: Użytkownik nie może rozpocząć nowego generowania, gdy flaga jest ustawiona
3. **Automatyczne czyszczenie**: Flaga jest czyszczona po zakończeniu generowania (sukces lub błąd)

## Notatki dla developera

1. **Bezpieczeństwo**: Funkcja automatycznie weryfikuje własność sesji - użytkownik może podsumować tylko swoje sesje

2. **Tryb asynchroniczny**: Funkcja zawsze działa asynchronicznie - zwraca natychmiastową odpowiedź i generuje podsumowanie w tle

3. **Polling**: Frontend powinien odpytywać o status generowania sprawdzając pole `generating_started_at` użytkownika

4. **Zapis do bazy**: Wygenerowane podsumowanie jest automatycznie zapisywane w polu `summary` tabeli `sessions`

5. **Koszty**: Każde wywołanie zużywa tokeny AI - podsumowania są zapisywane w bazie, więc nie generuj ich wielokrotnie

6. **Rate limiting**: Mechanizm blokowania zapobiega wielokrotnemu generowaniu przez tego samego użytkownika

7. **Offline**: Funkcja wymaga połączenia z internetem - obsłuż błędy sieciowe

8. **Timeout**: Frontend powinien implementować timeout (np. 60 sekund) dla pollingu
