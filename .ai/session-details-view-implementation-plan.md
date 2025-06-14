# Plan implementacji widoku SessionDetailsComponent

## 1. Przegląd
SessionDetailsComponent to widok szczegółów sesji treningowej, który umożliwia użytkownikowi przeglądanie informacji o konkretnej sesji oraz zarządzanie seriami ćwiczeń w ramach tej sesji. Widok wyświetla dane sesji (datę, opis, miejsce), statystyki treningowe (suma kilogramów i powtórzeń) oraz paginowaną listę serii ćwiczeń z możliwością ich edycji i usuwania.

## 2. Routing widoku
- **Ścieżka:** `/sessions/:id`
- **Parametr:** `id` - identyfikator sesji (number)
- **Guard:** Wymaga uwierzytelnienia użytkownika
- **Resolver:** SessionDetailsResolver - preloadowanie danych sesji

## 3. Struktura komponentów
```
SessionDetailsComponent (kontener)
├── PageHeaderComponent (nagłówek z breadcrumb)
├── SessionDetailsCardComponent (dane sesji)
├── StatsCardComponent (statystyki)
├── SessionSetsListComponent (lista serii)
│   ├── SessionSetItemComponent (pojedyncza seria)
│   └── MatPaginator (paginacja)
├── LoadingSpinnerComponent (stan ładowania)
├── EmptyStateComponent (brak serii)
└── ConfirmDialogComponent (potwierdzenie operacji)
```

## 4. Szczegóły komponentów

### SessionDetailsComponent
- **Opis:** Główny komponent widoku odpowiedzialny za orchestrację wszystkich podkomponentów i zarządzanie stanem widoku
- **Główne elementy:** 
  - Kontener z mat-card zawierający wszystkie sekcje
  - Obsługa stanów loading/error/success
  - Zarządzanie paginacją serii
- **Obsługiwane interakcje:**
  - Nawigacja do edycji sesji
  - Nawigacja do dodawania nowej serii
  - Usuwanie serii z potwierdzeniem
  - Zmiana strony paginacji
- **Obsługiwana walidacja:**
  - Walidacja parametru `id` z URL (musi być liczbą > 0)
  - Walidacja istnienia sesji (404 jeśli nie znaleziono)
  - Walidacja czy użytkownik jest autorem sesji
- **Typy:** SessionDetailsViewModel, SessionDetailsState
- **Propsy:** Brak (otrzymuje dane z route params)

### PageHeaderComponent
- **Opis:** Komponent nagłówka strony z tytułem, breadcrumb i przyciskami akcji
- **Główne elementy:**
  - Tytuł "Szczegóły treningu {data}"
  - Breadcrumb: "Treningi > Szczegóły treningu"
  - Przycisk "Edytuj sesję"
  - Przycisk "Dodaj serię"
- **Obsługiwane interakcje:**
  - Kliknięcie przycisku edycji
  - Kliknięcie przycisku dodawania serii
  - Nawigacja breadcrumb
- **Obsługiwana walidacja:** Brak
- **Typy:** PageHeaderProps
- **Propsy:** title: string, sessionId: number, onEdit: () => void, onAddSet: () => void

### SessionDetailsCardComponent
- **Opis:** Komponent wyświetlający podstawowe informacje o sesji
- **Główne elementy:**
  - Data i godzina sesji (sformatowane)
  - Opis sesji (jeśli dostępny)
  - Miejsce treningu (jeśli dostępne)
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Walidacja formatowania daty
- **Typy:** SessionDetailsProps
- **Propsy:** session: SessionWithStats

### StatsCardComponent
- **Opis:** Komponent wyświetlający statystyki sesji treningowej
- **Główne elementy:**
  - Suma kilogramów (total_weight)
  - Suma powtórzeń (total_reps)
  - Liczba ćwiczeń
- **Obsługiwane interakcje:** Brak
- **Obsługiwana walidacja:** Walidacja wartości numerycznych (>= 0)
- **Typy:** StatsCardProps
- **Propsy:** totalWeight: number, totalReps: number, exerciseCount: number

### SessionSetsListComponent
- **Opis:** Komponent listy serii ćwiczeń z paginacją
- **Główne elementy:**
  - Lista SessionSetItemComponent
  - MatPaginator (20 elementów na stronę)
  - Empty state gdy brak serii
- **Obsługiwane interakcje:**
  - Zmiana strony paginacji
  - Przekazywanie eventów edycji/usuwania z elementów listy
- **Obsługiwana walidacja:**
  - Walidacja opcji paginacji
  - Walidacja nieujemnej liczby elementów
- **Typy:** SessionSetsListProps, PaginationState
- **Propsy:** sets: ExerciseSetWithExercise[], totalCount: number, currentPage: number, onPageChange: (page: number) => void, onEditSet: (setId: number) => void, onDeleteSet: (setId: number) => void

### SessionSetItemComponent
- **Opis:** Komponent pojedynczej serii ćwiczenia w liście
- **Główne elementy:**
  - Nazwa ćwiczenia
  - Liczba powtórzeń
  - Ciężar w kg
  - Przyciski edycji i usuwania
- **Obsługiwane interakcje:**
  - Kliknięcie przycisku edycji
  - Kliknięcie przycisku usuwania
- **Obsługiwana walidacja:**
  - Walidacja wartości powtórzeń (1-300)
  - Walidacja wartości ciężaru (1-400 kg)
- **Typy:** SessionSetItemProps
- **Propsy:** set: ExerciseSetWithExercise, onEdit: (setId: number) => void, onDelete: (setId: number) => void

### ConfirmDialogComponent
- **Opis:** Komponent modalu potwierdzenia usunięcia serii
- **Główne elementy:**
  - Tytuł "Potwierdzenie usunięcia"
  - Treść ostrzeżenia
  - Przyciski "Anuluj" i "Usuń"
- **Obsługiwane interakcje:**
  - Potwierdzenie usunięcia
  - Anulowanie operacji
- **Obsługiwana walidacja:** Brak
- **Typy:** ConfirmDialogProps
- **Propsy:** isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void

## 5. Typy

### SessionDetailsViewModel
```typescript
interface SessionDetailsViewModel {
  session: SessionWithStats | null;
  sets: ExerciseSetWithExercise[];
  loading: boolean;
  error: string | null;
  paginationState: PaginationState;
}
```

### SessionDetailsState
```typescript
interface SessionDetailsState {
  sessionId: number;
  sessionDetails: SessionWithStats | null;
  sessionSets: ExerciseSetWithExercise[];
  isLoading: boolean;
  isLoadingSets: boolean;
  error: ApiError | null;
  currentPage: number;
  totalSetsCount: number;
  itemsPerPage: number;
}
```

### PaginationState
```typescript
interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

### PageHeaderProps
```typescript
interface PageHeaderProps {
  title: string;
  sessionId: number;
  sessionDate: string;
  onEditSession: () => void;
  onAddSet: () => void;
}
```

### SessionDetailsProps
```typescript
interface SessionDetailsProps {
  session: SessionWithStats;
}
```

### StatsCardProps
```typescript
interface StatsCardProps {
  totalWeight: number;
  totalReps: number;
  exerciseCount: number;
}
```

### SessionSetsListProps
```typescript
interface SessionSetsListProps {
  sets: ExerciseSetWithExercise[];
  loading: boolean;
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onEditSet: (setId: number) => void;
  onDeleteSet: (setId: number) => void;
}
```

### SessionSetItemProps
```typescript
interface SessionSetItemProps {
  set: ExerciseSetWithExercise;
  onEdit: (setId: number) => void;
  onDelete: (setId: number) => void;
}
```

### ConfirmDialogProps
```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
```

## 6. Zarządzanie stanem

Stan widoku będzie zarządzany przez główny komponent SessionDetailsComponent przy użyciu Angular signals lub tradycyjnych observables. Wymagane będą następujące elementy stanu:

- **sessionId**: number - ID sesji z parametrów URL
- **sessionDetails**: SessionWithStats | null - dane sesji
- **sessionSets**: ExerciseSetWithExercise[] - lista serii ćwiczeń
- **loading states**: boolean - stany ładowania dla różnych operacji
- **error**: ApiError | null - informacje o błędach
- **paginationOptions**: PaginationOptions - opcje paginacji

Stan będzie aktualizowany poprzez:
- Inicjalizację przy ładowaniu komponentu
- Reakcję na zmiany parametrów URL
- Obsługę akcji użytkownika (paginacja, usuwanie)
- Obsługę odpowiedzi z API

## 7. Integracja API

### Pobieranie szczegółów sesji
- **Endpoint:** `dbService.getSessionById(id: number)`
- **Typ żądania:** number (ID sesji)
- **Typ odpowiedzi:** Promise<SessionWithStats>
- **Obsługa błędów:** Przekierowanie na 404 jeśli sesja nie istnieje

### Pobieranie serii ćwiczeń
- **Endpoint:** `dbService.getSessionSets(sessionId: number, options: PaginationOptions)`
- **Typ żądania:** sessionId: number, options: PaginationOptions
- **Typ odpowiedzi:** Promise<ExerciseSetWithExercise[]>
- **Paginacja:** 20 elementów na stronę (PAGINATION.DEFAULT_SETS_LIMIT)

### Usuwanie serii
- **Endpoint:** `dbService.deleteExerciseSet(id: number)`
- **Typ żądania:** number (ID serii)
- **Typ odpowiedzi:** Promise<void>
- **Obsługa:** Odświeżenie listy serii i statystyk po usunięciu

## 8. Interakcje użytkownika

### Edycja sesji
- **Trigger:** Kliknięcie przycisku "Edytuj sesję"
- **Akcja:** Nawigacja do `/sessions/:id/edit`
- **Stan:** Przekazanie ID sesji w parametrach URL

### Dodawanie nowej serii
- **Trigger:** Kliknięcie przycisku "Dodaj serię"
- **Akcja:** Nawigacja do `/sessions/:id/sets/new`
- **Stan:** Przekazanie ID sesji w parametrach URL

### Edycja serii
- **Trigger:** Kliknięcie ikony edycji przy serii
- **Akcja:** Nawigacja do `/sessions/:sessionId/sets/:setId/edit`
- **Stan:** Przekazanie ID sesji i serii w parametrach URL

### Usuwanie serii
- **Trigger:** Kliknięcie ikony usuwania przy serii
- **Akcja:** Otwarcie modalu potwierdzenia
- **Proces:** Potwierdzenie → wywołanie API → odświeżenie danych → zamknięcie modalu
- **Stan:** Aktualizacja listy serii i statystyk sesji

### Paginacja serii
- **Trigger:** Kliknięcie przycisku paginacji
- **Akcja:** Zmiana parametru `page` i wywołanie API
- **Stan:** Aktualizacja currentPage i przeładowanie listy serii

### Breadcrumb nawigacja
- **Trigger:** Kliknięcie "Treningi" w breadcrumb
- **Akcja:** Nawigacja do `/sessions`
- **Stan:** Powrót do listy wszystkich sesji

## 9. Warunki i walidacja

### Walidacja parametru URL
- **Komponent:** SessionDetailsComponent
- **Warunek:** Parametr `id` musi być liczbą całkowitą > 0
- **Efekt:** Przekierowanie na 404 jeśli walidacja nie przejdzie

### Walidacja istnienia sesji
- **Komponent:** SessionDetailsComponent  
- **Warunek:** Sesja o podanym ID musi istnieć w bazie danych
- **Efekt:** Wyświetlenie błędu 404 jeśli sesja nie została znaleziona

### Walidacja paginacji
- **Komponent:** SessionSetsListComponent
- **Warunki:** 
  - `page` >= 1
  - `limit` = 20 (stała wartość)
- **Efekt:** Resetowanie do strony 1 jeśli parametry nieprawidłowe

### Walidacja uprawnień użytkownika
- **Komponent:** SessionDetailsComponent
- **Warunek:** Użytkownik może przeglądać tylko swoje sesje
- **Efekt:** Przekierowanie na stronę błędu jeśli brak uprawnień

### Walidacja limitów sesji
- **Komponent:** SessionSetsListComponent
- **Warunek:** Maksymalnie 50 serii na sesję (SESSION_LIMITS.MAX_SETS_PER_SESSION)
- **Efekt:** Wyłączenie przycisku "Dodaj serię" jeśli limit osiągnięty

## 10. Obsługa błędów

### Błędy ładowania sesji
- **Scenariusz:** Sesja nie istnieje lub brak uprawnień
- **Obsługa:** Wyświetlenie komponentu ErrorPageComponent z komunikatem "Sesja nie została znaleziona"
- **Akcja:** Przycisk powrotu do listy sesji

### Błędy ładowania serii
- **Scenariusz:** Problemy z pobraniem listy serii
- **Obsługa:** Wyświetlenie komunikatu błędu w miejscu listy serii
- **Akcja:** Przycisk "Spróbuj ponownie" do przeładowania danych

### Błędy usuwania serii
- **Scenariusz:** Nie udało się usunąć serii
- **Obsługa:** Wyświetlenie modalu z komunikatem błędu
- **Akcja:** Zamknięcie modalu, brak zmian w liście serii

### Błędy sieciowe
- **Scenariusz:** Brak połączenia z internetem
- **Obsługa:** Wyświetlenie globalnego komunikatu o problemach z połączeniem
- **Akcja:** Automatyczne ponowienie próby po przywróceniu połączenia

### Błędy walidacji
- **Scenariusz:** Nieprawidłowe parametry URL lub dane
- **Obsługa:** Przekierowanie na odpowiednią stronę błędu
- **Akcja:** Komunikat z instrukcją dla użytkownika

## 11. Kroki implementacji

1. **Utworzenie podstawowej struktury komponentu**
   - Wygenerowanie SessionDetailsComponent
   - Skonfigurowanie routingu z parametrem `:id`
   - Dodanie podstawowego template z Angular Material

2. **Implementacja pobierania danych**
   - Integracja z DbService.getSessionById()
   - Obsługa parametru ID z ActivatedRoute
   - Implementacja loading state i error handling

3. **Utworzenie komponentów wyświetlania danych**
   - PageHeaderComponent z breadcrumb i przyciskami
   - SessionDetailsCardComponent dla danych sesji
   - StatsCardComponent dla statystyk

4. **Implementacja listy serii ćwiczeń**
   - SessionSetsListComponent z paginacją
   - SessionSetItemComponent dla pojedynczych pozycji
   - Integracja z DbService.getSessionSets()

5. **Dodanie funkcjonalności usuwania serii**
   - ConfirmDialogComponent dla potwierdzenia
   - Integracja z DbService.deleteExerciseSet()
   - Odświeżanie danych po usunięciu

6. **Implementacja nawigacji**
   - Przyciski do edycji sesji i dodawania serii
   - Breadcrumb nawigacja
   - Obsługa powrotu do listy sesji

7. **Dodanie obsługi stanów pustych**
   - EmptyStateComponent dla sesji bez serii
   - LoadingSpinnerComponent dla operacji asynchronicznych
   - Komunikaty dla użytkownika

8. **Implementacja responsywności**
   - Dostosowanie layoutu dla urządzeń mobilnych
   - Optymalizacja komponentów Material dla dotknięć
   - Testowanie na różnych rozdzielczościach

9. **Dodanie walidacji i zabezpieczeń**
   - Walidacja parametrów URL
   - Ochrona przed nieautoryzowanym dostępem
   - Obsługa błędów API
