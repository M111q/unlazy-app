# Aplikacja - Unlazy (MVP)

## Główny problem
Użytkownicy potrzebują prostego i skutecznego sposobu na śledzenie swoich sesji treningowych oraz monitorowanie postępów w treningu. Obecnie brakuje im narzędzia, które pozwoliłoby na łatwe rejestrowanie wykonanych ćwiczeń, liczby powtórzeń i używanych ciężarów, a następnie przeglądanie statystyk podsumowujących ich wysiłek treningowy. Aplikacja Unlazy rozwiązuje ten problem, dostarczając prostą platformę do rejestrowania i analizowania danych treningowych, umożliwiając użytkownikom śledzenie swojego całkowitego obciążenia (suma kilogramów) i objętości treningu (suma powtórzeń) w poszczególnych sesjach.

## Zakres funkcjonalności MVP (In Scope)

### Zarządzanie użytkownikami
- **Rejestracja i logowanie** - użytkownicy mogą tworzyć konta i logować się za pomocą modułu Supabase Auth
- **Uwierzytelnianie** - bezpieczny dostęp do indywidualnych danych treningowych

### Zarządzanie sesjami treningowymi
- **Lista sesji** - paginowany widok sesji treningowych użytkownika z podstawowymi statystykami
- **Statystyki sesji** - automatyczne obliczanie i wyświetlanie sumy kilogramów i sumy powtórzeń dla każdej sesji
- **Szczegóły sesji** - paginowany widok detali sesji z listą serii ćwiczeń
- **CRUD dla sesji** - dodawanie, edycja i usuwanie sesji treningowych

### Zarządzanie seriami ćwiczeń
- **CRUD dla serii** - dodawanie, edycja i usuwanie serii w ramach sesji
- **Dane serii** - wybieranie nazwy ćwiczenia (z predefiniowanej listy), liczby powtórzeń i ciężaru w kilogramach

### Interfejs użytkownika
- **Uproszczona paginacja** - dla list sesji i serii ćwiczeń
- **Responsywny design** - dostosowanie do różnych urządzeń

## Funkcjonalności wykluczone z zakresu MVP (Out of Scope)

### Funkcje filtrowania i wyszukiwania
- **Filtrowanie sesji i serii** - funkcje wyszukiwania i filtrowania nie będą dostępne w pierwszej wersji
- **Zaawansowane sortowanie** - poza podstawową paginacją

### Rozszerzone zarządzanie ćwiczeniami
- **Niestandardowe nazwy ćwiczeń** - użytkownicy będą ograniczeni do predefiniowanej listy ćwiczeń
- **Ćwiczenia bez ciężaru** - nie będzie możliwości rejestrowania ćwiczeń wykonywanych bez obciążenia
- **Inne jednostki wagi** - obsługa tylko kilogramów, bez możliwości przełączania na funty czy inne jednostki

### Zaawansowane funkcje analityczne
- **Wykresy i zaawansowane statystyki** - poza podstawowymi sumami kilogramów i powtórzeń
- **Porównywanie sesji** - analiza trendów i porównania między sesjami
- **Eksport danych** - funkcje eksportu do plików zewnętrznych

### Funkcje AI i automatyzacja
- **Automatyczne podsumowania treningów** - funkcje wykorzystujące LLM będą rozważane w przyszłych wersjach
- **Rekomendacje treningowe** - inteligentne sugestie ćwiczeń lub planów treningowych

## Kryteria sukcesu MVP

### Wymagania kursowe (obowiązkowe)
- **Uwierzytelnianie użytkowników** - pełna implementacja rejestracji i logowania przez Supabase Auth
- **Logika biznesowa** - funkcja obliczania statystyk sesji (suma kilogramów i powtórzeń) jako demonstracja logiki biznesowej
- **Operacje CRUD** - kompletna implementacja tworzenia, odczytu, aktualizacji i usuwania dla sesji i serii
- **Test funkcjonalny** - co najmniej jeden test jednostkowy lub end-to-end weryfikujący kluczową funkcjonalność
- **CI/CD** - skonfigurowany pipeline GitHub Actions dla automatycznego testowania i wdrażania
- **Integracja z Supabase** - wykorzystanie Supabase jako bazy danych i dostawcy usług uwierzytelniania

### Kryteria techniczne
- **Wydajność** - akceptowalne czasy ładowania dla list sesji i serii (paginacja)
- **Zgodność z wybranymi technologiami** - skuteczne wykorzystanie Angular + Supabase + TypeScript zgodnie z wybranym stosem technologicznym
