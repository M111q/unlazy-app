# Dokument wymagań produktu (PRD) - Unlazy

## 1. Przegląd produktu

Unlazy to aplikacja MVP do śledzenia sesji treningowych skierowana do osób średnio zaawansowanych w treningu. Aplikacja umożliwia użytkownikom rejestrowanie wykonanych ćwiczeń, liczby powtórzeń i używanych ciężarów, a następnie przeglądanie statystyk podsumowujących ich wysiłek treningowy oraz generowanie motywujących podsumowań AI.

### Kluczowe funkcjonalności
- Uwierzytelnianie użytkowników przez Supabase Auth
- Zarządzanie sesjami treningowymi (CRUD)
- Zarządzanie seriami ćwiczeń w ramach sesji (CRUD)
- Automatyczne obliczanie statystyk sesji (suma kilogramów i powtórzeń)
- Generowanie podsumowań sesji treningowych przy użyciu AI
- Responsywny interfejs użytkownika z paginacją

### Stos technologiczny
- Frontend: Angular + TypeScript + Angular Material
- Backend: Supabase (baza danych + uwierzytelnianie + Edge Functions)
- AI: OpenRouter API
- Język interfejsu: Polski z przygotowaniem na internacjonalizację

## 2. Problem użytkownika

Użytkownicy potrzebują prostego i skutecznego sposobu na śledzenie swoich sesji treningowych oraz monitorowanie postępów w treningu. Obecnie brakuje im narzędzia, które pozwoliłoby na:

- Łatwe rejestrowanie wykonanych ćwiczeń, liczby powtórzeń i używanych ciężarów
- Przeglądanie statystyk podsumowujących wysiłek treningowy
- Śledzenie całkowitego obciążenia (suma kilogramów) i objętości treningu (suma powtórzeń)
- Otrzymywanie motywujących podsumowań treningów wygenerowanych przez AI
- Dostęp do indywidualnych danych treningowych w sposób bezpieczny i zorganizowany

### Grupa docelowa
Osoby średnio zaawansowane w treningu, które znają ćwiczenia i wiedzą jak je wykonać, ale potrzebują narzędzia do systematycznego śledzenia swoich postępów oraz motywacji do kontynuowania regularnych treningów.

## 3. Wymagania funkcjonalne

### 3.1 Uwierzytelnianie użytkowników
- Rejestracja nowych użytkowników przez Supabase Auth
- Logowanie istniejących użytkowników
- Bezpieczny dostęp do indywidualnych danych treningowych
- Ochrona tras wymagających autoryzacji

### 3.2 Zarządzanie sesjami treningowymi
- Tworzenie nowych sesji z datą/godziną, opisem i miejscem
- Edycja istniejących sesji
- Usuwanie sesji z potwierdzeniem
- Paginowana lista sesji sortowana od najnowszych
- Automatyczne obliczanie i wyświetlanie statystyk sesji

### 3.3 Zarządzanie seriami ćwiczeń
- Dodawanie serii do sesji z wyborem ćwiczenia, liczbą powtórzeń i ciężarem
- Edycja istniejących serii
- Usuwanie serii z potwierdzeniem
- Paginowany widok serii w ramach sesji

### 3.4 System ograniczeń
- Maksymalnie 3 sesje na dzień dla użytkownika
- Maksymalnie 50 serii w jednej sesji
- Zakres powtórzeń: 1-300 na serię
- Zakres ciężaru: 0.01-400 kg (z dokładnością do 0.01 kg)
- Opis sesji: maksymalnie 260 znaków
- Nazwa miejsca: maksymalnie 160 znaków

### 3.5 Walidacja i obsługa błędów
- Walidacja wszystkich pól numerycznych zgodnie z limitami
- Komunikaty błędów wyświetlane jako modale
- Zachowanie danych w formularzach do czasu zapisu
- Obsługa konfliktów (duplikaty sesji w tym samym czasie)

### 3.6 Lista ćwiczeń
- 20 predefiniowanych ćwiczeń w bazie danych
- Brak możliwości dodawania niestandardowych ćwiczeń w MVP

### 3.7 Generowanie podsumowań AI
- Generowanie podsumowań sesji na żądanie użytkownika
- Integracja z OpenRouter API przez Supabase Edge Function
- Przechowywanie wygenerowanych podsumowań w bazie danych
- Automatyczne usuwanie podsumowania przy modyfikacji serii ćwiczeń
- Blokada wielokrotnego generowania (jedna operacja na użytkownika)
- Timeout 30 sekund dla operacji generowania
- Graceful degradation przy niedostępności serwisu AI

## 4. Granice produktu

### 4.1 Funkcjonalności wykluczone z MVP

#### Funkcje filtrowania i wyszukiwania
- Filtrowanie sesji i serii
- Zaawansowane sortowanie poza podstawową paginacją
- Funkcje wyszukiwania

#### Rozszerzone zarządzanie ćwiczeniami
- Niestandardowe nazwy ćwiczeń
- Ćwiczenia bez ciężaru
- Inne jednostki wagi (tylko kilogramy)

#### Zaawansowane funkcje analityczne
- Wykresy i zaawansowane statystyki
- Porównywanie sesji i analiza trendów
- Eksport danych do plików zewnętrznych

#### Funkcje AI i automatyzacja
- Rekomendacje treningowe wykorzystujące LLM
- Automatyczne generowanie planów treningowych
- Analiza techniki wykonania ćwiczeń

#### Inne ograniczenia
- Brak pomiaru czasu trwania sesji
- Brak obsługi ćwiczeń cardio bez ciężarów
- Brak mechanizmu automatycznego czyszczenia flag przy awariach systemu
- Brak logowania analitycznego dla funkcji AI

## 5. Historyjki użytkowników

### 5.1 Uwierzytelnianie i autoryzacja

#### US-001: Rejestracja nowego użytkownika
Jako nowy użytkownik chcę zarejestrować się w aplikacji, aby uzyskać dostęp do funkcji śledzenia treningów.

Kryteria akceptacji:
- Formularz rejestracji zawiera pola: email, hasło, potwierdzenie hasła
- Walidacja poprawności adresu email
- Hasło musi spełniać wymagania bezpieczeństwa Supabase
- Po pomyślnej rejestracji użytkownik jest automatycznie zalogowany
- Komunikat błędu przy próbie rejestracji z istniejącym emailem

#### US-002: Logowanie użytkownika
Jako zarejestrowany użytkownik chcę zalogować się do aplikacji, aby uzyskać dostęp do moich danych treningowych.

Kryteria akceptacji:
- Formularz logowania zawiera pola: email i hasło
- Po pomyślnym logowaniu przekierowanie na stronę główną (lista sesji)
- Komunikat błędu przy nieprawidłowych danych logowania
- Zapamiętanie stanu logowania między sesjami

#### US-003: Wylogowanie użytkownika
Jako zalogowany użytkownik chcę móc się wylogować, aby zabezpieczyć swoje dane.

Kryteria akceptacji:
- Przycisk wylogowania dostępny w nawigacji
- Po wylogowaniu przekierowanie na stronę logowania
- Wyczyszczenie danych sesji użytkownika

#### US-004: Ochrona dostępu do danych
Jako użytkownik chcę, aby tylko ja miał dostęp do moich danych treningowych.

Kryteria akceptacji:
- Każdy użytkownik widzi tylko swoje sesje i serie
- Nieautoryzowany dostęp przekierowuje na stronę logowania
- Ochrona wszystkich tras wymagających uwierzytelniania

### 5.2 Zarządzanie sesjami treningowymi

#### US-005: Przeglądanie listy sesji
Jako użytkownik chcę przeglądać listę moich sesji treningowych, aby mieć przegląd swojej aktywności.

Kryteria akceptacji:
- Lista sesji sortowana od najnowszych
- Każda sesja wyświetla: datę/godzinę, opis, miejsce, statystyki (suma kg, suma powtórzeń)
- Paginacja z przyciskami "Następna"/"Poprzednia"
- Komunikat o braku sesji dla nowych użytkowników

#### US-006: Dodawanie nowej sesji
Jako użytkownik chcę dodać nową sesję treningową, aby zarejestrować swój trening.

Kryteria akceptacji:
- Formularz zawiera pola: data/godzina (domyślnie "teraz"), opis (max 260 znaków), miejsce (max 160 znaków)
- Walidacja unikalności sesji (brak duplikatów w tym samym czasie)
- Komunikat błędu przy przekroczeniu limitu 3 sesji dziennie
- Po zapisaniu przekierowanie do szczegółów sesji
- Zachowanie danych w formularzu przy błędach walidacji

#### US-007: Edycja sesji
Jako użytkownik chcę edytować detale swojej sesji, aby poprawić błędy lub uzupełnić informacje.

Kryteria akceptacji:
- Formularz edycji wypełniony aktualnymi danymi sesji
- Te same walidacje co przy dodawaniu
- Możliwość anulowania bez zapisywania zmian
- Komunikat potwierdzenia po zapisaniu
- Edycja metadanych sesji (opis, data, miejsce) nie usuwa istniejącego podsumowania AI

#### US-008: Usuwanie sesji
Jako użytkownik chcę usunąć sesję treningową, aby pozbyć się niepotrzebnych danych.

Kryteria akceptacji:
- Modal potwierdzenia z ostrzeżeniem o usunięciu wszystkich serii
- Możliwość anulowania operacji
- Usunięcie wszystkich powiązanych serii
- Przekierowanie na listę sesji po usunięciu

#### US-009: Przeglądanie szczegółów sesji
Jako użytkownik chcę zobaczyć szczegóły sesji wraz z listą serii, aby przeanalizować swój trening.

Kryteria akceptacji:
- Wyświetlanie danych sesji: data/godzina, opis, miejsce
- Statystyki sesji: suma kilogramów, suma powtórzeń
- Paginowana lista serii w sesji
- Przyciski do edycji sesji i dodania nowej serii
- Wyświetlanie podsumowania AI jeśli zostało wygenerowane
- Ikona generowania podsumowania AI dla sesji z ćwiczeniami bez podsumowania

### 5.3 Zarządzanie seriami ćwiczeń

#### US-010: Dodawanie serii do sesji
Jako użytkownik chcę dodać serię ćwiczenia do sesji, aby zarejestrować wykonane ćwiczenie.

Kryteria akceptacji:
- Formularz zawiera: dropdown z 20 predefiniowanymi ćwiczeniami, liczbę powtórzeń (1-300), ciężar w kg (0.01-400)
- Walidacja limitów numerycznych
- Komunikat błędu przy przekroczeniu 50 serii w sesji
- Automatyczne przeliczenie statystyk sesji po dodaniu
- Automatyczne usunięcie podsumowania AI po dodaniu nowej serii
- Zachowanie danych formularza przy błędach

#### US-011: Edycja serii
Jako użytkownik chcę edytować serię ćwiczenia, aby poprawić błędnie wprowadzone dane.

Kryteria akceptacji:
- Formularz edycji wypełniony aktualnymi danymi serii
- Te same walidacje co przy dodawaniu
- Automatyczne przeliczenie statystyk sesji po zapisaniu
- Możliwość anulowania bez zapisywania

#### US-012: Usuwanie serii
Jako użytkownik chcę usunąć serię z sesji, aby pozbyć się błędnych danych.

Kryteria akceptacji:
- Modal potwierdzenia usunięcia
- Możliwość anulowania operacji
- Automatyczne przeliczenie statystyk sesji po usunięciu
- Automatyczne usunięcie podsumowania AI po usunięciu serii
- Pozostanie na stronie szczegółów sesji

#### US-013: Przeglądanie serii w sesji
Jako użytkownik chcę przeglądać serie ćwiczeń w sesji, aby zobaczyć szczegóły swojego treningu.

Kryteria akceptacji:
- Lista serii z nazwą ćwiczenia, liczbą powtórzeń i ciężarem
- Paginacja dla sesji z wieloma seriami
- Przyciski edycji i usunięcia dla każdej serii
- Komunikat o braku serii w nowej sesji

### 5.4 Walidacja i obsługa błędów

#### US-014: Walidacja danych wejściowych
Jako użytkownik chcę otrzymywać jasne komunikaty o błędach, aby poprawnie wprowadzać dane.

Kryteria akceptacji:
- Walidacja limitów: 3 sesje/dzień, 50 serii/sesja, 1-300 powtórzeń, 0.01-400kg ciężar
- Walidacja długości tekstu: opis 260 znaków, miejsce 160 znaków
- Komunikaty błędów w modalu z opisem problemu
- Podświetlenie pól z błędami w formularzu

#### US-015: Obsługa konfliktów sesji
Jako użytkownik chcę być informowany o konfliktach czasowych, aby uniknąć duplikatów sesji.

Kryteria akceptacji:
- Wykrywanie prób dodania sesji w tym samym czasie
- Modal z komunikatem o konflikcie i opcjami rozwiązania
- Możliwość zmiany czasu lub anulowania operacji
- Zachowanie danych formularza przy konflikcie

### 5.5 Interfejs użytkownika i UX

#### US-016: Responsywny design
Jako użytkownik chcę korzystać z aplikacji na różnych urządzeniach, aby mieć dostęp do danych w każdej sytuacji.

Kryteria akceptacji:
- Aplikacja działa poprawnie na telefonach, tabletach i desktopach
- Mobile-first design z Angular Material
- Zachowanie funkcjonalności na wszystkich rozmiarach ekranu
- Optymalizacja dla urządzeń dotykowych

#### US-017: Nawigacja i paginacja
Jako użytkownik chcę łatwo nawigować po aplikacji, aby szybko znajdować potrzebne informacje.

Kryteria akceptacji:
- Intuicyjna nawigacja między sekcjami aplikacji
- Paginacja z przyciskami "Następna"/"Poprzednia"

#### US-018: Loading states i feedback
Jako użytkownik chcę wiedzieć o stanie operacji, aby rozumieć co się dzieje w aplikacji.

Kryteria akceptacji:
- Wskaźniki ładowania podczas operacji sieciowych
- Komunikaty potwierdzenia po udanych operacjach
- Wyraźne komunikaty błędów z instrukcjami
- Zachowanie stanu formularzy podczas operacji

### 5.6 Generowanie podsumowań AI

#### US-019: Generowanie podsumowania sesji AI
Jako użytkownik chcę wygenerować podsumowanie mojej sesji treningowej przy użyciu AI, aby otrzymać motywującą ocenę swojego treningu.

Kryteria akceptacji:
- Ikona różdżki (wand/auto_awesome) widoczna tylko dla sesji zawierających ćwiczenia
- Ikona umieszczona po prawej stronie naprzeciwko napisu "Statystyki"
- Tooltip "Wygeneruj podsumowanie AI" przy najechaniu na ikonę
- Kliknięcie ikony inicjuje generowanie podsumowania
- Loading state z animacją podczas generowania (bez blokowania innych funkcji)
- Toast notification "Podsumowanie zostało wygenerowane" po udanym zakończeniu
- Debouncing przycisku zapobiegający wielokrotnym kliknięciom

#### US-020: Wyświetlanie podsumowania AI
Jako użytkownik chcę widzieć wygenerowane podsumowanie mojej sesji, aby nie musieć generować go ponownie.

Kryteria akceptacji:
- Podsumowanie wyświetlane pod statystykami sesji
- Ten sam styl wizualny co statystyki (kg, powtórzenia)
- Fade-in animacja przy pojawieniu się podsumowania
- Sesje z już wygenerowanym podsumowaniem nie pokazują ikony generowania
- Podsumowanie widoczne przy każdym wejściu do szczegółów sesji

#### US-021: Obsługa błędów generowania AI
Jako użytkownik chcę otrzymać jasny komunikat o błędzie i możliwość ponownej próby, gdy generowanie podsumowania nie powiedzie się.

Kryteria akceptacji:
- Komunikat błędu wyświetlany jako toast z opisem problemu
- Przycisk "Spróbuj ponownie" w komunikacie błędu
- Ikona generowania pozostaje dostępna po błędzie
- Timeout 30 sekund zgodnie z dokumentacją Edge Function
- Graceful degradation - aplikacja działa normalnie gdy funkcja AI jest niedostępna

#### US-022: Blokada wielokrotnego generowania
Jako użytkownik chcę mieć pewność, że nie uruchomię przypadkowo wielu operacji generowania jednocześnie.

Kryteria akceptacji:
- Flaga `is_generating` per użytkownik blokuje wielokrotne generowania
- Walidacja po stronie frontendu przed wysłaniem żądania
- Komunikat informujący o trwającym generowaniu
- Możliwość opuszczenia strony podczas generowania (backend-first approach)

#### US-023: Automatyczne usuwanie przestarzałych podsumowań
Jako użytkownik chcę, aby podsumowanie było automatycznie usuwane przy modyfikacji sesji, ponieważ staje się wtedy nieaktualne.

Kryteria akceptacji:
- Dodanie nowej serii usuwa istniejące podsumowanie
- Usunięcie serii usuwa istniejące podsumowanie
- Edycja metadanych sesji (opis, data, miejsce) NIE usuwa podsumowania
- Po usunięciu podsumowania ikona generowania pojawia się ponownie

## 6. Metryki sukcesu

### 6.1 Kryteria techniczne
- Akceptowalne czasy ładowania dla paginowanych list (< 2 sekundy)
- Czas generowania podsumowania AI < 30 sekund
- Prawidłowe działanie na urządzeniach mobilnych i desktopowych
- Skuteczne wykorzystanie Angular + Supabase + TypeScript + Edge Functions
- Bezpieczne przechowywanie i dostęp do danych użytkowników
- Graceful degradation przy niedostępności serwisów zewnętrznych

### 6.2 Kryteria użyteczności
- Intuicyjny workflow: Logowanie → lista sesji → dodaj sesję → szczegóły sesji → dodaj serię → generuj podsumowanie
- Minimalistyczny i przejrzysty interfejs użytkownika
- Skuteczna walidacja z jasnymi komunikatami błędów
- Zachowanie danych użytkownika w formularzach przy błędach
- Intuicyjność funkcji AI bez potrzeby instrukcji

### 6.3 Wskaźniki sukcesu biznesowego
- Możliwość rejestrowania sesji treningowych przez grupę docelową bez przeszkolenia
- Automatyczne obliczanie statystyk pozwalające na śledzenie postępów
- Adopcja funkcji AI przez większość aktywnych użytkowników
- Zwiększenie zaangażowania użytkowników dzięki motywującym podsumowaniom
- Stabilne działanie aplikacji bez utraty danych użytkowników
- Przygotowanie architektury na przyszły rozwój funkcjonalności

### 6.4 Definicja ukończenia MVP
- Wszystkie historie użytkownika zaimplementowane i przetestowane
- Funkcja generowania podsumowań AI w pełni zintegrowana
- Aplikacja wdrożona i dostępna online
- Dokumentacja techniczna i użytkownika kompletna
- Pozytywne testy użyteczności z reprezentantami grupy docelowej
- Spełnienie wszystkich wymagań kursowych
