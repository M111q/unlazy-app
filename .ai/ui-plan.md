# Architektura UI dla Unlazy MVP

## 1. Przegląd struktury UI

Aplikacja Unlazy MVP to Angular 19 + TypeScript + Angular Material z mobile-first podejściem. Architektura oparta na feature modules (AuthModule, SessionsModule, ExerciseSetsModule) z wydzielonym SharedModule dla komponentów wielokrotnego użytku.

**Główne założenia architektoniczne:**
- Dwupoziomowy system layoutów: AuthLayout (bez nawigacji) i MainLayout (z stałym menu górnym)
- Accordion-based lista sesji z pierwszym elementem domyślnie rozwiniętym
- Wszystkie formularze w modalach z disableClose: true
- Paginacja numeryczna (10 elementów na stronę)
- Zarządzanie stanem przez Angular Signals w serwisach (signals, computed, effects)
- Responsywne breakpointy: mobile 95%, tablet 80%, desktop max 700px, 2K+ max 900px

## 2. Lista widoków

### LoginComponent
- **Ścieżka:** `/login`
- **Główny cel:** Uwierzytelnianie istniejących użytkowników
- **Kluczowe informacje:** Formularz logowania (email, hasło), link do rejestracji
- **Kluczowe komponenty:** 
  - Reactive form z walidacją przy blur
  - Progress spinner podczas logowania
  - Error handling z modal dla błędów połączenia
- **UX/Dostępność/Bezpieczeństwo:** 
  - Auto-focus na polu email
  - Walidacja inline z mat-error
  - Zabezpieczenie przed wielokrotnymi submission
  - AuthGuard przekierowuje zalogowanych użytkowników

### RegisterComponent
- **Ścieżka:** `/register`
- **Główny cel:** Rejestracja nowych użytkowników
- **Kluczowe informacje:** Formularz rejestracji (email, hasło, potwierdzenie hasła), link do logowania
- **Kluczowe komponenty:**
  - Reactive form z walidacją haseł
  - Progress spinner podczas rejestracji
  - Potwierdzenie rejestracji
- **UX/Dostępność/Bezpieczeństwo:**
  - Auto-focus na polu email
  - Walidacja siły hasła zgodnie z wymaganiami Supabase
  - Sprawdzanie zgodności haseł
  - Automatyczne przekierowanie po rejestracji

### SessionListComponent
- **Ścieżka:** `/sessions`
- **Główny cel:** Przeglądanie listy sesji treningowych użytkownika
- **Kluczowe informacje:** 
  - Lista sesji w formie accordion (pierwszy rozwinięty), data/godzina i opis widoczny bez rozwijania
  - Statystyki każdej sesji (suma kg, suma powtórzeń) oraz opis widoczne po rozwinięciu
  - Data/godzina, opis, miejsce sesji
- **Kluczowe komponenty:**
  - SessionAccordionComponent z MatExpansionPanel
  - StatsCardComponent dla statystyk
  - MatPaginator (10 elementów, 3 kolejne numery stron)
  - FAB do dodawania nowej sesji
- **UX/Dostępność/Bezpieczeństwo:**
  - Loading spinner podczas ładowania listy
  - Empty state dla nowych użytkowników
  - Programowe kontrolowanie stanu accordion
  - Komunikat o limitach (3 sesje/dzień)

### SessionDetailsComponent
- **Ścieżka:** `/sessions/:id`
- **Główny cel:** Wyświetlanie szczegółów sesji i zarządzanie seriami ćwiczeń
- **Kluczowe informacje:**
  - Detale sesji (data/godzina, opis, miejsce)
  - Statystyki sesji (suma kg, suma powtórzeń)
  - Lista serii ćwiczeń z paginacją
- **Kluczowe komponenty:**
  - PageHeaderComponent z tytułem "Szczegóły treningu {data}"
  - StatsCardComponent dla statystyk sesji
  - Lista serii z nazwą ćwiczenia, powtórzeniami, ciężarem
  - MatPaginator dla serii (20 elementów na stronę)
  - Przyciski edycji sesji i dodawania serii
- **UX/Dostępność/Bezpieczeństwo:**
  - Loading spinner dla szczegółów
  - Empty state dla sesji bez serii
  - Potwierdzenie usunięcia serii
  - Breadcrumb w tytule z datą sesji

### SessionFormModal
- **Główny cel:** Dodawanie i edycja sesji treningowych
- **Kluczowe informacje:**
  - Formularz: data/godzina, opis (max 260 znaków), miejsce (max 160 znaków)
  - Domyślne wartości: data/godzina=teraz, opis=pusty, miejsce=puste
- **Kluczowe komponenty:**
  - BaseModalComponent z disableClose: true
  - Reactive form z walidacją przy blur
  - MatDatepicker + MatTimepicker
  - Character counter dla pól tekstowych
- **UX/Dostępność/Bezpieczeństwo:**
  - Auto-focus na pierwszym polu
  - Walidacja unikalności czasowej
  - Sprawdzanie limitu 3 sesji/dzień
  - Przyciski "Zatwierdź"/"Anuluj"
  - Keyboard navigation (Enter/Escape)

### ExerciseSetFormModal
- **Główny cel:** Dodawanie i edycja serii ćwiczeń w sesji
- **Kluczowe informacje:**
  - Formularz: wybór ćwiczenia, liczba powtórzeń (1-300), ciężar (1-400kg)
  - Lista 20 predefiniowanych ćwiczeń
- **Kluczowe komponenty:**
  - BaseModalComponent z disableClose: true
  - MatAutocomplete dla wyboru ćwiczenia
  - Number inputs z walidacją zakresów
  - Reactive form z walidacją przy blur
- **UX/Dostępność/Bezpieczeństwo:**
  - Auto-focus na polu wyboru ćwiczenia
  - Walidacja limitów numerycznych
  - Sprawdzanie limitu 50 serii/sesja
  - Autocomplete z filtrowaniem ćwiczeń
  - Komunikat o przekroczeniu limitów

## 3. Mapa podróży użytkownika

### Główny przepływ użytkownika:
1. **Wejście do aplikacji:** `/login` (AuthLayoutComponent)
2. **Uwierzytelnianie:** Login/Register → przekierowanie do `/sessions`
3. **Przegląd sesji:** Lista sesji w accordion (MainLayoutComponent)
4. **Zarządzanie sesjami:**
   - Dodawanie sesji: FAB → SessionFormModal → powrót do listy
   - Edycja sesji: przycisk edycji → SessionFormModal → powrót do listy
   - Usuwanie sesji: przycisk usunięcia → modal potwierdzenia
5. **Szczegóły sesji:** Kliknięcie nagłówka accordion → `/sessions/:id`
6. **Zarządzanie seriami:**
   - Dodawanie serii: przycisk "Dodaj serię" → ExerciseSetFormModal
   - Edycja serii: przycisk edycji → ExerciseSetFormModal
   - Usuwanie serii: przycisk usunięcia → modal potwierdzenia

### Alternatywne przepływy:
- **Wylogowanie:** TopNavigation → przycisk wylogowania → `/login`
- **Błędy walidacji:** Pozostanie w modalach z komunikatami błędów
- **Błędy połączenia:** Modal z komunikatem błędu + opcja ponowienia

### Obsługa stanów brzegowych:
- **Nowy użytkownik:** Empty state na liście sesji z instrukcją dodania pierwszej sesji
- **Limit sesji:** Modal z informacją o przekroczeniu limitu dziennego
- **Limit serii:** Modal z informacją o przekroczeniu limitu sesyjnego
- **Brak połączenia:** Loading spinner + retry mechanism

## 4. Układ i struktura nawigacji

### Hierarchia layoutów:
```
AppComponent
├── AuthLayoutComponent (routes: /login, /register)
│   ├── LoginComponent
│   └── RegisterComponent
└── MainLayoutComponent (routes: /sessions, /sessions/:id)
    ├── TopNavigationComponent (stałe pozycjonowanie)
    ├── PageHeaderComponent (dynamiczny tytuł)
    └── Router Outlet
        ├── SessionListComponent
        └── SessionDetailsComponent
```

### TopNavigationComponent (stałe menu górne):
- **Logo:** "Unlazy" z podpisem "gym app" (lewy górny róg)
- **User info:** Pełny adres email użytkownika (centrum)
- **Actions:** Przycisk wylogowania (prawy górny róg)
- **Responsywność:** Collapse na mobile z hamburger menu

### Routing structure (płaska bez nested routes):
```
/login → LoginComponent (AuthLayoutComponent)
/register → RegisterComponent (AuthLayoutComponent)
/sessions → SessionListComponent (MainLayoutComponent)
/sessions/:id → SessionDetailsComponent (MainLayoutComponent)
```

### Guards i resolvers:
- **AuthGuard:** Ochrona tras `/sessions` i `/sessions/:id`
- **CanDeactivateGuard:** Ochrona niezapisanych danych w modalach
- **SessionResolver:** Pre-loading danych sesji dla szczegółów

## 5. Kluczowe komponenty

### Komponenty SharedModule:

#### TopNavigationComponent
- **Cel:** Stała nawigacja dla zalogowanych użytkowników
- **Funkcjonalność:** Logo, email użytkownika, wylogowanie
- **Responsywność:** Collapse na mobile z drawer

#### PageHeaderComponent
- **Cel:** Dynamiczne tytuły widoków
- **Tytuły:** "Sesje treningowe", "Szczegóły treningu {data}"
- **Funkcjonalność:** Przycisk powrotu dla szczegółów sesji

#### BaseModalComponent
- **Cel:** Template dla wszystkich modali
- **Konfiguracja:** disableClose: true, standardowe przyciski
- **Funkcjonalność:** Keyboard navigation, auto-focus

#### LoadingSpinnerComponent
- **Cel:** Unified loading states
- **Implementacja:** MatProgressSpinner z overlay
- **Użycie:** Loading danych, operacje CRUD

#### ErrorModalComponent
- **Cel:** Wyświetlanie błędów połączenia z bazą
- **Funkcjonalność:** Retry mechanism, user-friendly komunikaty
- **Implementacja:** BaseModalComponent + error handling

### Komponenty SessionsModule:

#### SessionAccordionComponent
- **Cel:** Lista sesji w formie accordion
- **Funkcjonalność:** Pierwszy element rozwinięty, programowe kontrolowanie
- **Implementacja:** MatExpansionPanel z custom styling

#### StatsCardComponent
- **Cel:** Wyświetlanie statystyk sesji
- **Dane:** Suma kilogramów, suma powtórzeń
- **Styling:** Material Card z highlight dla ważnych danych

#### SessionFormComponent
- **Cel:** Formularz dodawania/edycji sesji w modalu
- **Walidacja:** Inline przy blur, character counters
- **Domyślne wartości:** Data/godzina=teraz

### Komponenty ExerciseSetsModule:

#### ExerciseSetFormComponent
- **Cel:** Formularz dodawania/edycji serii w modalu
- **Funkcjonalność:** MatAutocomplete dla ćwiczeń, walidacja limitów
- **Auto-focus:** Pierwsze pole (wybór ćwiczenia)

#### ExerciseSetListComponent
- **Cel:** Lista serii w szczegółach sesji
- **Funkcjonalność:** Paginacja, CRUD operations
- **Wyświetlanie:** Nazwa ćwiczenia, powtórzenia, ciężar

### Komponenty pomocnicze:

#### ConfirmationModalComponent
- **Cel:** Potwierdzenia usunięcia sesji/serii
- **Implementacja:** BaseModalComponent z custom content
- **Funkcjonalność:** Przycisk "Usuń"/"Anuluj"

#### PaginatorComponent
- **Cel:** Numeryczna paginacja (10 elementów, 3 kolejne numery)
- **Implementacja:** MatPaginator z polskim tłumaczeniem
- **Responsywność:** Simplified controls na mobile

#### ValidationErrorComponent
- **Cel:** Wyświetlanie błędów walidacji inline
- **Implementacja:** mat-error z dynamic content
- **Styling:** Material Design error styling
