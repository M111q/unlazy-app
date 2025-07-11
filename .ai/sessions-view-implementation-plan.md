# Plan implementacji widoku SessionListComponent

## 1. Przegląd

SessionListComponent to główny widok aplikacji Unlazy MVP, umożliwiający użytkownikom przeglądanie listy swoich sesji treningowych. Widok wyświetla sesje w formie accordion z automatycznie obliczonymi statystykami (suma kilogramów i powtórzeń), oferuje paginację oraz możliwości zarządzania sesjami (dodawanie, edytowanie, usuwanie). Implementacja oparta jest na Angular Material z responsywnym designem mobile-first.

## 2. Routing widoku

- **Ścieżka:** `/sessions`
- **Layout:** `MainLayoutComponent` (z `TopNavigationComponent`)
- **Guard:** `AuthGuard` - wymaga uwierzytelnienia użytkownika
- **Tytuł strony:** "Sesje treningowe" (przez `PageHeaderComponent`)

## 3. Struktura komponentów

```
SessionListComponent (główny kontener)
├── LoadingSpinnerComponent (podczas ładowania danych)
├── EmptyStateComponent (gdy brak sesji)
├── SessionAccordionComponent (lista sesji)
│   ├── mat-expansion-panel (dla każdej sesji)
│   │   ├── mat-expansion-panel-header
│   │   │   ├── panel-title (data/godzina sesji)
│   │   │   └── panel-description (opis sesji)
│   │   └── mat-expansion-panel-content
│   │       ├── StatsCardComponent (statystyki sesji)
│   │       ├── AISummaryPreviewComponent (podsumowanie AI jeśli istnieje)
│   │       ├── session-details (miejsce, pełny opis)
│   │       └── action-buttons (Edytuj, Usuń, Szczegóły)
│   └── mat-paginator (paginacja)
├── mat-fab (przycisk dodawania nowej sesji)
├── SessionFormModalComponent (modal dodawania/edycji)
└── ConfirmationModalComponent (potwierdzenie usunięcia)
```

## 4. Szczegóły komponentów

### SessionListComponent
- **Opis:** Główny kontener widoku, zarządza stanem listy sesji, paginacją i operacjami CRUD
- **Główne elementy:** Container div, loading spinner, empty state, accordion component, FAB, modale
- **Obsługiwane interakcje:** 
  - Ładowanie listy sesji przy inicjalizacji
  - Obsługa paginacji (zmiana strony)
  - Otwieranie modala dodawania sesji (FAB)
  - Otwieranie modala edycji sesji
  - Otwieranie modala potwierdzenia usunięcia
- **Obsługiwana walidacja:** 
  - Walidacja limitu 3 sesji dziennie przed pokazaniem modala
  - Walidacja uprawnień użytkownika (tylko własne sesje)
- **Typy:** `SessionListViewModel`, `PaginationViewModel`, `ApiError`
- **Propsy:** Brak (główny komponent route)

### SessionAccordionComponent
- **Opis:** Komponent wyświetlający listę sesji w formie accordion z pierwszym elementem automatycznie rozwiniętym
- **Główne elementy:** `mat-accordion`, `mat-expansion-panel` dla każdej sesji, nagłówki paneli, zawartość paneli
- **Obsługiwane interakcje:**
  - Rozwijanie/zwijanie paneli accordion
  - Programowe kontrolowanie stanu rozwinięcia pierwszego elementu
  - Klikanie przycisków akcji (edytuj, usuń, szczegóły)
- **Obsługiwana walidacja:** Brak na poziomie komponentu
- **Typy:** `SessionItemViewModel[]`, `EventEmitter` dla akcji
- **Propsy:** 
  - `sessions: SessionItemViewModel[]` - lista sesji do wyświetlenia
  - `@Output() editSession: EventEmitter<SessionItemViewModel>`
  - `@Output() deleteSession: EventEmitter<number>`
  - `@Output() viewDetails: EventEmitter<number>`

#### StatsCardComponent
- **Opis:** Komponent wyświetlający statystyki sesji (suma kilogramów i powtórzeń) w formie karty Material Design
- **Główne elementy:** `mat-card`, `mat-card-content`, ikony Material, wartości liczbowe z jednostkami
- **Obsługiwane interakcje:** Brak (tylko wyświetlanie)
- **Obsługiwana walidacja:** Walidacja czy przekazane wartości są liczbami nieujemnymi
- **Typy:** `SessionStats`
- **Propsy:**
  - `totalWeight: number` - suma kilogramów w sesji
  - `totalReps: number` - suma powtórzeń w sesji

#### AISummaryPreviewComponent
- **Opis:** Komponent wyświetlający skrócone podsumowanie AI w accordion sesji
- **Główne elementy:** `mat-card` z treścią podsumowania, ikona AI (auto_awesome)
- **Obsługiwane interakcje:** Brak (pełne podsumowanie widoczne w szczegółach)
- **Obsługiwana walidacja:** Sprawdzenie czy podsumowanie istnieje
- **Typy:** `AISummaryPreview`
- **Propsy:**
  - `summary: string | null` - treść podsumowania AI
  - `maxLength?: number` - maksymalna długość wyświetlanego tekstu (domyślnie 150 znaków)

### SessionFormModalComponent
- **Opis:** Modal do dodawania i edycji sesji z formularzem reaktywnym i walidacją
- **Główne elementy:** `mat-dialog`, `form`, `mat-form-field`, `mat-datepicker`, `mat-input`, przyciski akcji
- **Obsługiwane interakcje:**
  - Obsługa formularza reaktywnego
  - Walidacja w czasie rzeczywistym (blur events)
  - Zapisywanie i anulowanie zmian
  - Auto-focus na pierwszym polu
- **Obsługiwana walidacja:**
  - Data/godzina sesji
  - Opis sesji (maksymalnie 260 znaków)
  - Miejsce (maksymalnie 160 znaków)
  - Unikalność czasu sesji (brak duplikatów)
  - Limit 3 sesji dziennie
- **Typy:** `SessionFormViewModel`, `CreateSessionDto`, `UpdateSessionDto`, `ValidationError[]`
- **Propsy:**
  - `mode: 'create' | 'edit'` - tryb działania modala
  - `session?: SessionItemViewModel` - dane sesji do edycji (opcjonalne)
  - `@Output() sessionSaved: EventEmitter<Session>`
  - `@Output() cancelled: EventEmitter<void>`

### EmptyStateComponent
- **Opis:** Komponent wyświetlający komunikat dla nowych użytkowników bez sesji
- **Główne elementy:** Container div, ikona, tytuł, opis, przycisk call-to-action
- **Obsługiwane interakcje:** Klikanie przycisku "Dodaj pierwszą sesję"
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak
- **Propsy:**
  - `@Output() addFirstSession: EventEmitter<void>`

### ConfirmationModalComponent
- **Opis:** Modal potwierdzenia usunięcia sesji z ostrzeżeniem o usunięciu wszystkich serii
- **Główne elementy:** `mat-dialog`, tytuł, treść ostrzeżenia, przyciski "Usuń"/"Anuluj"
- **Obsługiwane interakcje:** Potwierdzenie lub anulowanie usunięcia
- **Obsługiwana walidacja:** Brak
- **Typy:** Brak specjalnych typów
- **Propsy:**
  - `sessionDescription: string` - opis sesji do usunięcia
  - `@Output() confirmed: EventEmitter<void>`
  - `@Output() cancelled: EventEmitter<void>`

## 5. Typy

### SessionListViewModel
```typescript
interface SessionListViewModel {
  sessions: SessionItemViewModel[];
  pagination: PaginationViewModel;
  loading: boolean;
  error: ApiError | null;
  canAddSession: boolean; // sprawdza limit dzienny
}
```

### SessionItemViewModel
```typescript
interface SessionItemViewModel {
  id: number;
  sessionDatetime: Date;
  description: string | null;
  location: string | null;
  totalWeight: number;
  totalReps: number;
  formattedDate: string; // dla wyświetlenia
  formattedTime: string; // dla wyświetlenia
  isExpandedByDefault: boolean; // dla pierwszego elementu
  summary: string | null; // podsumowanie AI jeśli istnieje
}
```

### SessionFormViewModel
```typescript
interface SessionFormViewModel {
  sessionDatetime: Date;
  description: string | null;
  location: string | null;
  isSubmitting: boolean;
  validationErrors: ValidationError[];
}
```

### PaginationViewModel
```typescript
interface PaginationViewModel {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### SessionStats
```typescript
interface SessionStats {
  totalWeight: number;
  totalReps: number;
}
```

### AISummaryPreview
```typescript
interface AISummaryPreview {
  summary: string | null;
  maxLength?: number;
}
```

### ValidationError
```typescript
interface ValidationError {
  field: string;
  message: string;
  code: string;
}
```

## 6. Zarządzanie stanem

Zarządzanie stanem realizowane przez **SessionListService** z wykorzystaniem Angular Signals:

### Główne sygnały stanu:
- `sessions = signal<SessionItemViewModel[]>([]` - lista sesji
- `loading = signal<boolean>(false)` - stan ładowania
- `error = signal<ApiError | null>(null)` - błędy
- `pagination = signal<PaginationViewModel>(/* initial pagination state */)` - dane paginacji

### Sygnały obliczane (computed):
- `viewModel = computed(() => ({
    sessions: this.sessions(),
    pagination: this.pagination(),
    loading: this.loading(),
    error: this.error(),
    canAddSession: /* computed logic based on sessions and date */
  }))` - połączony widok stanu dla komponentu

### Metody modyfikujące stan (update/mutate signals) lub wywołujące efekty:
- `loadSessions(page: number): void` - modyfikuje `loading`, `sessions`, `pagination`, `error` sygnały na podstawie odpowiedzi API
- `refreshCurrentPage(): void` - wywołuje `loadSessions` dla aktualnej strony
- `addSession(session: CreateSessionDto): Observable<Session>` - po sukcesie wywołuje `refreshCurrentPage` lub optymistycznie aktualizuje stan
- `updateSession(id: number, updates: UpdateSessionDto): Observable<Session>` - po sukcesie wywołuje `refreshCurrentPage` lub optymistycznie aktualizuje stan
- `deleteSession(id: number): Observable<void>` - po sukcesie wywołuje `refreshCurrentPage` lub optymistycznie aktualizuje stan

### Efekty (Effects):
- Efekty mogą być użyte do synchronizacji stanu z lokalnym storage, logowania zmian stanu, lub wyzwalania innych operacji pobocznych w odpowiedzi na zmiany sygnałów stanu. (Konkretne efekty zostaną zdefiniowane w implementacji SessionListService).

## 7. Integracja API

### Używane endpointy z SessionsService:

#### getSessions()
- **Typ żądania:** `PaginationOptions`
- **Typ odpowiedzi:** `SessionWithStats[]`
- **Użycie:** Pobieranie listy sesji z paginacją, automatycznie obliczonymi statystykami i podsumowaniami AI

#### createSession()
- **Typ żądania:** `CreateSessionDto`
- **Typ odpowiedzi:** `Session`
- **Użycie:** Dodawanie nowej sesji z walidacją limitu dziennego

#### updateSession()
- **Typ żądania:** `number, UpdateSessionDto`
- **Typ odpowiedzi:** `Session`
- **Użycie:** Edycja istniejącej sesji

#### deleteSession()
- **Typ żądania:** `number`
- **Typ odpowiedzi:** `void`
- **Użycie:** Usuwanie sesji i wszystkich powiązanych serii

### Obsługa błędów API:
- Błędy połączenia → `ErrorModalComponent`
- Błędy walidacji → inline w formularzach
- Błędy limitów → dedykowane komunikaty

## 8. Interakcje użytkownika

### Wchodzenie na stronę:
1. Aktywacja `AuthGuard`
2. Ładowanie pierwszej strony sesji (`page=0, limit=10`)
3. Wyświetlenie loading spinner
4. Po załadowaniu: wyświetlenie accordion z pierwszym elementem rozwiniętym
5. Jeśli brak sesji: wyświetlenie `EmptyStateComponent`
6. Sesje z podsumowaniami AI wyświetlają preview w accordion

### Paginacja:
1. Klikanie "Następna"/"Poprzednia" w `mat-paginator`
2. Wywołanie `loadSessions(newPage)`
3. Loading spinner podczas ładowania
4. Aktualizacja listy z zachowaniem stanu accordion (pierwszy rozwinięty)

### Dodawanie sesji:
1. Klikanie FAB → sprawdzenie limitu dziennego
2. Jeśli limit przekroczony → komunikat błędu
3. Jeśli OK → otwarcie `SessionFormModalComponent` w trybie 'create'
4. Wypełnienie formularza → walidacja na blur
5. Klikanie "Zapisz" → wywołanie API → zamknięcie modala → odświeżenie listy

### Edycja sesji:
1. Klikanie "Edytuj" w accordion
2. Otwarcie `SessionFormModalComponent` w trybie 'edit' z danymi sesji
3. Modyfikacja danych → walidacja
4. Zapisanie → aktualizacja listy

### Usuwanie sesji:
1. Klikanie "Usuń" w accordion
2. Otwarcie `ConfirmationModalComponent` z ostrzeżeniem
3. Potwierdzenie → wywołanie API → usunięcie z listy
4. Anulowanie → zamknięcie modala

### Szczegóły sesji:
1. Klikanie "Szczegóły" w accordion
2. Nawigacja do `/sessions/:id`

## 9. Warunki i walidacja

### Walidacja na poziomie SessionListComponent:
- **Dostęp do danych:** Sprawdzenie czy użytkownik ma dostęp tylko do swoich sesji (RLS w Supabase)
- **Limit dzienny:** Sprawdzenie przed otwarciem modala dodawania (maksymalnie 3 sesje dziennie)

### Walidacja na poziomie SessionFormModalComponent:
- **Data/godzina sesji:** 
  - Pole wymagane
  - Nie może być w przyszłości
  - Musi być unikalna (brak duplikatów w tym samym czasie)
- **Opis sesji:**
  - Maksymalnie 260 znaków
  - Pole opcjonalne
- **Miejsce:**
  - Maksymalnie 160 znaków  
  - Pole opcjonalne

### Walidacja na poziomie StatsCardComponent:
- **Statystyki:** Sprawdzenie czy `totalWeight` i `totalReps` są liczbami nieujemnymi

### Wpływ walidacji na stan UI:
- Błędy walidacji → wyświetlenie `mat-error` pod polami
- Błędy API → modal `ErrorModalComponent`
- Przekroczenie limitów → dedykowane komunikaty w modalach
- Formularz nieprawidłowy → przycisk "Zapisz" wyłączony

## 10. Obsługa błędów

### Błędy połączenia z API:
- **Scenariusz:** Brak internetu, błąd serwera
- **Obsługa:** `ErrorModalComponent` z opcją ponowienia
- **UI:** Loading spinner → modal błędu

### Błędy walidacji:
- **Scenariusz:** Nieprawidłowe dane formularza
- **Obsługa:** Inline `mat-error` w polach formularza
- **UI:** Podświetlenie błędnych pól, komunikaty pod polami

### Błędy biznesowe:
- **Limit sesji dzienny:** Modal z komunikatem "Osiągnięto limit 3 sesji dziennie"
- **Duplikat czasu:** Modal z możliwościa powrotu do formularza i zmiany czasu lub anulowania
- **Brak uprawnień:** Przekierowanie na stronę logowania

### Błędy loading states:
- **Długie ładowanie:** Timeout po 30 sekundach z opcją ponowienia
- **Błąd paginacji:** Pozostanie na aktualnej stronie z komunikatem błędu

### Fallback states:
- **Brak sesji:** `EmptyStateComponent` z zachętą do dodania pierwszej sesji
- **Błąd ładowania:** Retry button z możliwością odświeżenia
- **Częściowe błędy:** Wyświetlenie załadowanych danych z komunikatem o problemach

## 11. Kroki implementacji

1. **Przygotowanie infrastruktury**
   - Stworzenie `SessionsModule` z routing
   - Konfiguracja `SessionListComponent` jako main component
   - Dodanie trasy `/sessions` z `AuthGuard`

2. **Implementacja podstawowego SessionListComponent**
   - Stworzenie komponentu z podstawowym template
   - Implementacja `SessionListService` z BehaviorSubject
   - Integracja z `SessionsService` dla API calls

3. **Implementacja SessionAccordionComponent**
   - Stworzenie komponentu z `mat-accordion`
   - Implementacja logiki pierwszego elementu rozwiniętego
   - Dodanie przycisków akcji (edytuj, usuń, szczegóły)
   - Integracja AISummaryPreviewComponent dla sesji z podsumowaniami

4. **Implementacja StatsCardComponent**
   - Stworzenie komponentu z `mat-card`
   - Stylowanie dla wyświetlania statystyk
   - Dodanie ikon Material dla wag i powtórzeń

5. **Implementacja AISummaryPreviewComponent**
   - Stworzenie komponentu do wyświetlania skróconych podsumowań
   - Stylowanie z ikoną AI
   - Logika skracania tekstu z ellipsis

6. **Implementacja EmptyStateComponent**
   - Stworzenie komponentu dla nowych użytkowników
   - Dodanie ilustracji i call-to-action
   - Integracja z action buttons

7. **Implementacja SessionFormModalComponent**
   - Stworzenie modala z formularzem reaktywnym
   - Implementacja walidacji (inline i async)
   - Obsługa trybów create/edit
   - Integracja z `mat-datepicker` i `mat-input`

8. **Implementacja ConfirmationModalComponent**
   - Stworzenie prostego modala potwierdzenia
   - Dodanie ostrzeżenia o usuwaniu serii
   - Implementacja przycisków akcji

9. **Implementacja paginacji**
   - Integracja `mat-paginator` z SessionAccordionComponent
   - Implementacja logiki ładowania kolejnych stron
   - Dodanie loading states dla paginacji

10. **Implementacja zarządzania stanem**
   - Finalizacja `SessionListService` z wszystkimi metodami
   - Implementacja error handling
   - Dodanie loading states i optimistic updates

11. **Stylowanie i responsywność**
    - Implementacja mobile-first CSS
    - Optymalizacja dla różnych breakpoints
    - Stylowanie accordion i modali według Material Design

12. **Testy i walidacja**
    - Unit testy dla komponentów
    - Integration testy dla service
    - Testy E2E dla głównych flow'ów użytkownika
    - Walidacja zgodności z PRD i User Stories

13. **Optimizacja i finalizacja**
    - Optimizacja performance (OnPush change detection)
    - Implementacja lazy loading dla modali
    - Finalizacja error handling i edge cases
    - Code review i dokumentacja
