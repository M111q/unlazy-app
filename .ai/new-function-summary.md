# Podsumowanie zmian - Funkcja generowania podsumowań AI

## 1. Zmiany w bazie danych

### 1.1 Nowe kolumny

#### Tabela `users`
- **Kolumna:** `is_generating BOOLEAN NOT NULL DEFAULT FALSE`
- **Cel:** Flaga blokująca wielokrotne generowanie podsumowań przez tego samego użytkownika
- **Opis:** Zapobiega uruchamianiu wielu operacji AI jednocześnie per użytkownik

#### Tabela `sessions`
- **Kolumna:** `summary TEXT`
- **Cel:** Przechowywanie wygenerowanych podsumowań AI
- **Opis:** Nullable pole tekstowe dla treści podsumowania sesji treningowej

### 1.2 Nowe funkcje i triggery

#### Funkcja `clear_session_summary()`
```sql
CREATE OR REPLACE FUNCTION public.clear_session_summary()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.sessions
    SET summary = NULL
    WHERE id = COALESCE(NEW.session_id, OLD.session_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Trigger `trigger_clear_session_summary`
- **Zdarzenia:** AFTER INSERT OR DELETE ON exercise_sets
- **Cel:** Automatyczne usuwanie podsumowania przy zmianie serii ćwiczeń
- **Logika:** Ustawia `summary = NULL` gdy serie są dodawane lub usuwane

### 1.3 Indeksy
- **Indeks:** `idx_users_is_generating` na `users(is_generating) WHERE is_generating = true`
- **Cel:** Szybkie wyszukiwanie użytkowników z aktywnym generowaniem

### 1.4 Migracja
- **Plik:** `20250109204239_add_ai_summary_feature.sql`
- **Zawartość:** ALTER TABLE dla nowych kolumn, CREATE FUNCTION/TRIGGER, CREATE INDEX

## 2. Zmiany w widokach/UI

### 2.1 SessionDetailsComponent

#### Nowe komponenty
1. **AISummaryComponent**
   - Wyświetlanie wygenerowanego podsumowania
   - Animacja fade-in przy pojawianiu się
   - Loading state z pulsującą animacją podczas generowania
   - Pozycja: Pod StatsCardComponent

2. **ToastNotificationComponent**
   - Powiadomienia systemowe (MatSnackBar)
   - Auto-dismiss po 3 sekundach
   - Komunikaty: "Podsumowanie zostało wygenerowane", błędy

#### Zaktualizowane komponenty
1. **StatsCardComponent**
   - Dodana ikona AI (wand/auto_awesome) po prawej stronie napisu "Statystyki"
   - Tooltip: "Wygeneruj podsumowanie AI"
   - Ikona widoczna tylko gdy:
     - Sesja ma ćwiczenia
     - Nie ma jeszcze podsumowania
     - Użytkownik nie generuje obecnie (is_generating = false)

#### Nowe propsy i typy
```typescript
// StatsCardProps - rozszerzone
{
  hasExerciseSets: boolean;
  hasSummary: boolean;
  isGenerating: boolean;
  onGenerateSummary: () => void;
}

// AISummaryProps
{
  summary: string | null;
  isGenerating: boolean;
}

// SummaryState
{
  isGenerating: boolean;
  summary: string | null;
  canGenerate: boolean;
}
```

### 2.2 SessionListComponent

#### Nowe komponenty
1. **AISummaryPreviewComponent**
   - Wyświetlanie skróconego podsumowania w accordion sesji
   - Maksymalnie 150 znaków z ellipsis
   - Ikona AI (auto_awesome) przy treści
   - Widoczne tylko gdy sesja ma podsumowanie

#### Zaktualizowane typy
```typescript
// SessionItemViewModel - rozszerzone
{
  summary: string | null;
}

// AISummaryPreview
{
  summary: string | null;
  maxLength?: number;
}
```

## 3. Zmiany funkcjonalne

### 3.1 Serwisy

#### AI Summary Service
```typescript
class AISummaryService {
  // Główna metoda generowania
  async generateSessionSummary(sessionId: number): Promise<string>;
  
  // Pobieranie podsumowania
  async getSessionSummary(sessionId: number): Promise<string | null>;
  
  // Czyszczenie podsumowania (ręczne)
  async clearSessionSummary(sessionId: number): Promise<void>;
  
  // Sprawdzanie stanu generowania
  async isGeneratingSummary(): Promise<boolean>;
  
  // Zarządzanie flagą is_generating
  private async setGeneratingFlag(isGenerating: boolean): Promise<void>;
}
```

#### Zaktualizowane typy (types.ts)
```typescript
// Rozszerzone typy bazowe
export type User = Pick<Tables<"users">, "auth_user_id" | "email" | "id" | "is_generating">;
export type Session = Pick<Tables<"sessions">, "description" | "id" | "location" | "session_datetime" | "user_id" | "summary">;

// Rozszerzone DTOs
export interface UpdateSessionDto {
  summary?: string | null;
}

export interface SessionWithStats extends Session {
  summary?: string | null;
}

// Nowe typy dla AI
export interface GenerateSummaryRequest {
  sessionId: number;
}

export interface GenerateSummaryResponse {
  summary: string;
  sessionId: number;
  tokensUsed?: number;
}

export interface SummaryError {
  error: string;
  code: string;
}
```

### 3.2 Logika biznesowa

#### Warunki generowania
1. Sesja musi mieć co najmniej jedną serię ćwiczeń
2. Sesja nie może mieć już wygenerowanego podsumowania
3. Użytkownik nie może mieć aktywnej flagi is_generating
4. Edge Function timeout: 30 sekund

#### Automatyczne czyszczenie
- Trigger bazodanowy usuwa podsumowanie przy:
  - Dodaniu nowej serii (INSERT)
  - Usunięciu serii (DELETE)
- NIE usuwa przy:
  - Edycji metadanych sesji (opis, data, miejsce)
  - Edycji istniejących serii

#### Obsługa błędów
1. **Timeout (30s):** Toast z błędem, reset flagi is_generating
2. **Już generuje:** Toast "Generowanie w toku, proszę czekać"
3. **Błąd API:** Toast z opcją ponownej próby
4. **Graceful degradation:** Aplikacja działa bez funkcji AI

### 3.3 Flow użytkownika

1. **Generowanie podsumowania:**
   - Użytkownik klika ikonę AI w StatsCard
   - Sprawdzenie warunków (canGenerate)
   - Ustawienie is_generating = true
   - Loading state (pulsująca animacja)
   - Wywołanie Edge Function
   - Zapisanie podsumowania w bazie
   - Reset is_generating = false
   - Toast "Podsumowanie zostało wygenerowane"
   - Wyświetlenie AISummaryComponent

2. **Backend-first approach:**
   - Użytkownik może opuścić stronę podczas generowania
   - Generowanie kontynuowane w tle
   - Podsumowanie dostępne przy powrocie

### 3.4 Integracja z Edge Function

#### Endpoint
- **URL:** `/functions/v1/openrouter`
- **Metoda:** POST
- **Body:** `{ sessionId: number }`
- **Autoryzacja:** Bearer token (JWT)

#### Odpowiedź
```typescript
// Sukces
{
  summary: string;
  sessionId: number;
  tokensUsed?: number;
}

// Błąd
{
  error: string;
  code: string;
}
```

## 4. Kluczowe decyzje projektowe

1. **Ikona AI:** Różdżka (wand/auto_awesome) z Material Icons
2. **Pozycja ikony:** Po prawej stronie napisu "Statystyki"
3. **Backend-first:** Generowanie w tle, użytkownik może opuścić stronę
4. **Flaga per user:** Nie per sesja - jeden użytkownik = jedno generowanie
5. **Automatyczne czyszczenie:** Przez DB trigger, nie kod aplikacji
6. **Limit czasowy:** 30 sekund (wymóg Edge Function)
7. **Toast notifications:** Dla sukcesu i błędów
8. **Brak cache:** Każde żądanie generuje nowe podsumowanie

## 5. Nierozwiązane kwestie

1. Brak mechanizmu automatycznego czyszczenia "zawiedzionych" flag is_generating
2. Brak strategii migracji dla istniejących sesji
3. Brak logowania błędów dla celów debugowania
4. Brak limitów użycia (rate limiting)
5. Brak mechanizmu timeout cleanup dla flag