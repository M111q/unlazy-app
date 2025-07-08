# Session Summary API - Dokumentacja

## Opis

Edge Function generująca podsumowanie sesji treningowej przy użyciu AI. Funkcja pobiera dane o sesji treningowej użytkownika i zwraca krótkie, motywujące podsumowanie w języku polskim.

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
  "summary": string,      // Podsumowanie sesji wygenerowane przez AI
  "sessionId": number,    // ID podsumowanej sesji
  "tokensUsed": number    // Liczba tokenów zużytych przez AI (opcjonalne)
}
```

### Przykład odpowiedzi

```json
{
  "summary": "Świetny trening! Skupiłeś się na górnych partiach ciała, wykonując łącznie 3 serie wyciskania sztangi i 4 serie podciągania. Twoje mięśnie klatki piersiowej i pleców z pewnością odczują ten wysiłek. Tak trzymaj i pamiętaj o regularności - następny trening czeka!",
  "sessionId": 123,
  "tokensUsed": 156
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


## Notatki dla developera

1. **Bezpieczeństwo**: Funkcja automatycznie weryfikuje własność sesji - użytkownik może podsumować tylko swoje sesje

2. **Cache**: Podsumowania nie są cache'owane - każde wywołanie generuje nowe podsumowanie

3. **Koszty**: Każde wywołanie zużywa tokeny AI - rozważ zapisywanie podsumowań w bazie

4. **Rate limiting**: Obecnie brak limitów, ale warto dodać throttling po stronie frontendu

5. **Offline**: Funkcja wymaga połączenia z internetem - obsłuż błędy sieciowe
