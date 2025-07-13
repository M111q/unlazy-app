# Podsumowanie zmian - Funkcja generowania podsumowań AI

## 1. Zmiany w bazie danych

### 1.1 Nowe kolumny

#### Tabela `users`
- **Kolumna:** `generating_started_at TIMESTAMP DEFAULT NULL`
- **Cel:** Timestamp blokujący wielokrotne generowanie podsumowań przez tego samego użytkownika
- **Opis:** Jeśli ma wartość - generowanie trwa, jeśli NULL - brak aktywnego generowania

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
- **Indeks:** `idx_users_generating_started_at` na `users(generating_started_at) WHERE generating_started_at IS NOT NULL`
- **Cel:** Szybkie wyszukiwanie użytkowników z aktywnym generowaniem

### 1.4 Funkcja czyszczenia "martwych" procesów
```sql
-- Scheduled function lub cron job (co 5 minut)
CREATE OR REPLACE FUNCTION public.cleanup_stale_generating_flags()
RETURNS void AS $$
BEGIN
    UPDATE public.users 
    SET generating_started_at = NULL
    WHERE generating_started_at IS NOT NULL 
      AND generating_started_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.5 Migracja
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
     - Użytkownik nie generuje obecnie (generating_started_at IS NULL)

#### Nowe propsy i typy
```typescript
// StatsCardProps - rozszerzone
{
  hasExerciseSets: boolean;
  hasSummary: boolean;
  isGenerating: boolean; // true gdy generating_started_at IS NOT NULL
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
  // Główna metoda generowania - asynchroniczne z pollingiem
  async generateSessionSummary(sessionId: number): Promise<void> {
    try {
      // Szybkie uruchomienie procesu generowania (< 1s)
      const { data, error } = await this.supabase.functions.invoke('ai-summary', {
        body: { sessionId }
      });
      
      if (error) throw error;
      
      if (data.started) {
        // Rozpocznij polling na timestamp generating_started_at
        this.startGenerationPolling(sessionId);
      }
      
    } catch (error) {
      this.handleGenerationError(error, sessionId);
    }
  };
  
  // Polling sprawdzający stan generowania
  private startGenerationPolling(sessionId: number): void {
    const pollInterval = setInterval(async () => {
      const user = await this.getUserProfile();
      
      if (!user.generating_started_at) {
        // Generowanie zakończone!
        clearInterval(pollInterval);
        await this.refreshSessionData(sessionId);
        this.showToast('Podsumowanie zostało wygenerowane', 'success');
      }
    }, 2000); // sprawdzaj co 2 sekundy
    
    // Timeout po 60 sekundach
    setTimeout(() => {
      clearInterval(pollInterval);
      this.showToast('Generowanie trwa dłużej niż oczekiwano. Sprawdź ponownie za chwilę.', 'warning');
    }, 60000);
  };
  
  // Pobieranie sesji z podsumowaniem (odświeżenie danych)
  async refreshSessionData(sessionId: number): Promise<SessionWithStats>;
  
  // Czyszczenie podsumowania (ręczne)
  async clearSessionSummary(sessionId: number): Promise<void>;
  
  // Sprawdzanie stanu generowania (dla fallback scenarios)
  async isGeneratingSummary(): Promise<boolean>; // zwraca true gdy generating_started_at IS NOT NULL
  
  // Zarządzanie timestampem generowania
  private async setGeneratingTimestamp(timestamp: Date | null): Promise<void>;
  
  // Obsługa błędów generowania
  private handleGenerationError(error: any, sessionId: number): void;
}
```

#### Zaktualizowane typy (types.ts)
```typescript
// Rozszerzone typy bazowe
export type User = Pick<Tables<"users">, "auth_user_id" | "email" | "id" | "generating_started_at">;
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
3. Użytkownik nie może mieć aktywnego timestampu generating_started_at (musi być NULL)
4. Edge Function timeout: 30 sekund
5. Sprawdzenie race condition: przed pokazaniem ikony AI, ponownie weryfikuj stan generating_started_at

#### Automatyczne czyszczenie
- Trigger bazodanowy usuwa podsumowanie przy:
  - Dodaniu nowej serii (INSERT)
  - Usunięciu serii (DELETE)
- NIE usuwa przy:
  - Edycji metadanych sesji (opis, data, miejsce)
  - Edycji istniejących serii

#### Obsługa błędów
1. **Timeout (30s):** Toast z błędem, reset timestampu generating_started_at do NULL
2. **Już generuje:** Toast "Generowanie w toku, proszę czekać"
3. **Błąd API:** Toast z opcją ponownej próby
4. **Graceful degradation:** Aplikacja działa bez funkcji AI

### 3.3 Flow użytkownika

#### 1. Generowanie podsumowania (Asynchroniczne z pollingiem):
   - Użytkownik klika ikonę AI w StatsCard
   - Sprawdzenie warunków (canGenerate)
   - Loading state (pulsująca animacja) - nie blokuje innych funkcji
   - Wywołanie Edge Function `/ai-summary` - szybka odpowiedź `{ started: true }`
   - Edge Function pracuje w tle: ustawia generating_started_at → generuje → zapisuje → resetuje generating_started_at do NULL
   - Angular rozpoczyna polling co 2 sekundy sprawdzając timestamp generating_started_at
   - Gdy timestamp = NULL: odświeżenie danych sesji + toast sukcesu
   - Wyświetlenie AISummaryComponent z nowym podsumowaniem

#### 2. Backend-first approach:
   - Użytkownik może swobodnie nawigować po aplikacji podczas generowania
   - Polling działa tylko gdy użytkownik jest na stronie szczegółów sesji
   - Jeśli użytkownik opuści stronę, generowanie kontynuuje w tle
   - Przy powrocie podsumowanie jest już gotowe (jeśli generowanie się zakończyło)

#### 3. Obsługa timeout i błędów:
   - **Timeout pollingu (60s):** Toast "Generowanie trwa dłużej niż oczekiwano. Sprawdź ponownie za chwilę."
   - **Błąd API:** Toast z opisem błędu (Edge Function zwraca błąd zamiast `{ started: true }`)
   - **Już generuje:** Edge Function zwraca `{ error: "Already generating" }`
   - **Race condition:** Przed kliknięciem sprawdź aktualny stan generating_started_at
   - **Wylogowanie:** Czyszczenie lokalnego stanu pollingu i odświeżenie po ponownym zalogowaniu

### 3.4 Integracja z Edge Function

#### Endpoint
- **URL:** `/functions/v1/ai-summary`
- **Metoda:** POST
- **Body:** `{ sessionId: number }`
- **Autoryzacja:** Bearer token (JWT)
- **Headers:** `X-Request-ID` (opcjonalnie) dla idempotentności

#### Edge Function Flow
1. **Walidacja:** sprawdza uprawnienia użytkownika i warunki sesji
2. **Sprawdza idempotentność:** jeśli request_id już był przetwarzany, zwraca cached response
3. **Ustawia timestamp:** `generating_started_at = NOW()` w tabeli users
4. **Generuje:** wywołuje OpenRouter API dla podsumowania
5. **Zapisuje:** ustawia `sessions.summary` w bazie danych
6. **Kończy:** resetuje `generating_started_at = NULL`
7. **Cache response:** zapisuje wynik dla request_id (TTL: 24h)

#### Odpowiedź
```typescript
// Sukces - proces rozpoczęty
{
  started: true;
  sessionId: number;
  estimatedTime?: number; // opcjonalnie szacowany czas w sekundach
}

// Błąd - nie można rozpocząć
{
  error: string;
  code: string; // np. "ALREADY_GENERATING", "NO_SETS", "SUMMARY_EXISTS"
}
```

## 4. Kluczowe decyzje projektowe

1. **Ikona AI:** Różdżka (wand/auto_awesome) z Material Icons
2. **Pozycja ikony:** Po prawej stronie napisu "Statystyki"
3. **Asynchroniczne przetwarzanie:** Edge Function odpowiada szybko, pracuje w tle
4. **Polling na bazie:** Angular sprawdza flagę is_generating co 2 sekundy
5. **Timeout pollingu:** 60 sekund (2x dłużej niż Edge Function timeout)
6. **Jedna Edge Function:** `/ai-summary` robi wszystko (generate + save + cleanup)
7. **Timestamp per user:** Nie per sesja - jeden użytkownik = jedno generowanie
8. **Automatyczne czyszczenie:** Przez DB trigger, nie kod aplikacji
9. **Toast notifications:** Dla sukcesu, błędów i timeout
10. **Brak cache:** Każde żądanie generuje nowe podsumowanie

## 5. Architektura Edge Function

### 5.1 Zalecana architektura: Jeden Edge Function

#### `/ai-summary` - Complete Solution
```typescript
// Edge Function: /ai-summary
export default async function(request: Request) {
  // 1. Walidacja JWT i uprawnień użytkownika
  // 2. Sprawdzenie warunków sesji (ma ćwiczenia, brak podsumowania, generating_started_at IS NULL)
  // 3. Ustawienie generating_started_at = NOW()
  // 4. Natychmiastowa odpowiedź { started: true }
  
  // Asynchronicznie (po zwróceniu odpowiedzi):
  // 5. Wywołanie OpenRouter API
  // 6. Zapisanie podsumowania do sessions.summary
  // 7. Reset generating_started_at = NULL
}
```

**Zalety tego podejścia:**
- Atomowość całej operacji
- Jedna operacja biznesowa = jedna funkcja
- Minimalna latencja sieciowa
- Prostsze error handling
- Idealne dla MVP

## 6. Do przyszłego rozwoju

### 6.1 Funkcje do implementacji w kolejnych wersjach

1. **Database locks dla pełnej ochrony przed race conditions**
   ```sql
   -- Przykład użycia SELECT FOR UPDATE
   BEGIN;
   SELECT generating_started_at FROM users WHERE id = :user_id FOR UPDATE;
   -- Jeśli NULL, ustaw timestamp
   UPDATE users SET generating_started_at = NOW() WHERE id = :user_id AND generating_started_at IS NULL;
   COMMIT;
   ```
   - Gwarantuje atomowość operacji sprawdzenia i ustawienia
   - Eliminuje możliwość równoczesnego rozpoczęcia dwóch generowań
   - Wymaga transakcji, co może zwiększyć złożoność Edge Function

2. **Hash/checksum dla zawartości sesji**
   - Dodanie kolumny `content_hash` do tabeli `sessions`
   - Porównywanie hash przed generowaniem dla wykrycia zmian w seriach
   - Umożliwi precyzyjną kontrolę kiedy podsumowanie jest nieaktualne

3. **System limitów i throttlingu**
   ```sql
   -- Propozycja tabeli dla limitów
   CREATE TABLE user_ai_usage (
     user_id INT REFERENCES users(id),
     date DATE DEFAULT CURRENT_DATE,
     generations_count INT DEFAULT 0,
     PRIMARY KEY (user_id, date)
   );
   ```
   - Dzienny/godzinowy limit generowań per użytkownik
   - Ochrona przed nadużyciami i kontrola kosztów

4. **Lepsza widoczność stanu generowania**
   - Progress bar z szacowanym czasem
   - Notyfikacje o zakończeniu (nawet po opuszczeniu strony)
   - Status generowania widoczny w liście sesji

5. **Architektura event-driven z Supabase Realtime**
   ```typescript
   // Zamiast pollingu
   const subscription = supabase
     .channel('summary-updates')
     .on('postgres_changes', 
       { 
         event: 'UPDATE', 
         schema: 'public', 
         table: 'sessions',
         filter: `id=eq.${sessionId}`
       }, 
       payload => {
         if (payload.new.summary) {
           // Podsumowanie gotowe!
         }
       }
     )
     .subscribe();
   ```
   - Redukcja obciążenia bazy (brak pollingu)
   - Natychmiastowe powiadomienia
   - Lepsza skalowalność

### 6.2 Pozostałe kwestie

1. **Brak strategii migracji dla istniejących sesji**
   - Istniejące sesje nie mają podsumowań
   - Czy dodać batch generation czy zostawić do wygenerowania na żądanie?

3. **Brak logowania błędów dla celów debugowania**
   - Edge Function powinno logować błędy do Supabase logs
   - Angular powinien raportować błędy do serwisu analitycznego

4. **Brak mechanizmu retry po stronie Edge Function**
   - Jeśli OpenRouter API zwróci błąd tymczasowy
   - Edge Function powinno mieć exponential backoff retry

5. **Polling może obciążać bazę przy wielu użytkownikach**
   - Każdy aktywny użytkownik odpytuje bazę co 2 sekundy
   - W przyszłości rozważyć WebSockets lub Server-Sent Events (patrz sekcja 6.1)
