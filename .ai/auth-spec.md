# Specyfikacja architektury modułu autentykacji - Unlazy

## 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 1.1 Nowe komponenty i strony

#### 1.1.1 Komponenty autentykacji 
- **LoginComponent** (`src/app/features/auth/components/login/login.component.ts`)
  - Walidacja formularza z custom validatorami
  - Obsługa błędów przez AuthService
  - Przycisk "Zapomniałeś hasła?" z routerLink do reset-password
  - Przycisk "Nie masz konta? Zarejestruj się" z routerLink do register

- **RegisterComponent** (`src/app/features/auth/components/register/register.component.ts`)
  - Walidacja zgodności haseł przez custom validator
  - Walidacja wymagań bezpieczeństwa hasła
  - Obsługa błędów rejestracji
  - Przycisk "Masz już konto? Zaloguj się" z routerLink do login

- **ResetPasswordComponent** (`src/app/features/auth/components/reset-password/reset-password.component.ts`)
  - Formularz z polem email do resetowania hasła
  - Komunikat potwierdzenia wysłania emaila
  - RouterLink powrotu do logowania

- **UpdatePasswordComponent** (`src/app/features/auth/components/update-password/update-password.component.ts`)
  - Formularz zmiany hasła z polami: nowe hasło, potwierdzenie nowego hasła
  - Walidacja zgodności haseł
  - Obsługa tokenów resetowania hasła z URL params

#### 1.1.2 Layout i nawigacja (Standalone Components)
- **AuthLayoutComponent** (`src/app/features/auth/layouts/auth-layout/auth-layout.component.ts`)
  - Uproszczony layout dla stron autentykacji
  - Brak nawigacji głównej aplikacji
  - Centralne pozycjonowanie formularzy
  - Responsywny design z Angular Material
  - Import RouterOutlet dla nested routing

- **MainLayoutComponent** (`src/app/shared/layouts/main-layout/main-layout.component.ts`)
  - Layout dla zalogowanych użytkowników
  - Toolbar z tytułem aplikacji i przyciskiem wylogowania
  - Nawigacja główna
  - RouterOutlet dla zawartości stron

### 1.2 Modyfikacje istniejących komponentów

#### 1.2.1 AppComponent
- Dodanie AuthLayoutComponent i MainLayoutComponent
- Usunięcie prostego `<router-outlet>` na rzecz warunkowego renderowania layoutów
- Integracja z AuthService do określenia aktualnego layoutu

#### 1.2.2 SessionListComponent i SessionDetailsComponent
- Dodanie sprawdzenia stanu uwierzytelniania
- Obsługa przekierowania do logowania dla niezalogowanych użytkowników
- Zachowanie istniejącej funkcjonalności dla zalogowanych użytkowników

### 1.3 Walidacja i komunikaty błędów

#### 1.3.1 Walidatory formularzy
- **EmailValidator**: Walidacja poprawności adresu email
- **PasswordValidator**: Walidacja wymagań bezpieczeństwa hasła
- **PasswordMatchValidator**: Walidacja zgodności haseł w formularzach
- **RequiredValidator**: Walidacja wymaganych pól

#### 1.3.2 Obsługa błędów
- **ErrorDialogComponent** (`src/app/shared/components/error-dialog/error-dialog.component.ts`)
  - Modal wyświetlający komunikaty błędów
  - Integracja z MatDialog
  - Typy błędów: walidacja, sieć, autentykacja, autoryzacja

- **Komunikaty błędów**:
  - "Nieprawidłowy adres email" - błąd walidacji email
  - "Hasło musi zawierać co najmniej 8 znaków" - wymagania hasła
  - "Hasła nie są zgodne" - niezgodność haseł
  - "Użytkownik o podanym adresie email już istnieje" - duplikat przy rejestracji
  - "Nieprawidłowe dane logowania" - błąd logowania
  - "Wystąpił błąd sieci. Spróbuj ponownie." - błędy połączenia

### 1.4 Główne scenariusze UX

#### 1.4.1 Przepływ rejestracji
1. Użytkownik wchodzi na `/register`
2. Wypełnia formularz rejestracji
3. System waliduje dane po stronie klienta
4. Wysłanie danych do Supabase Auth
5. Obsługa odpowiedzi: sukces → automatyczne logowanie → przekierowanie na `/sessions`
6. Obsługa błędów: wyświetlenie modala z komunikatem błędu

#### 1.4.2 Przepływ logowania
1. Użytkownik wchodzi na `/login` (lub jest przekierowany)
2. Wypełnia formularz logowania
3. System waliduje dane po stronie klienta
4. Wysłanie danych do Supabase Auth
5. Obsługa odpowiedzi: sukces → przekierowanie na `/sessions`
6. Obsługa błędów: wyświetlenie komunikatu w formularzu

#### 1.4.3 Przepływ wylogowania
1. Użytkownik klika przycisk "Wyloguj" w toolbar
2. System wywołuje AuthService.logout()
3. Wyczyszczenie danych sesji
4. Przekierowanie na `/login`

## 2. LOGIKA BACKENDOWA

### 2.1 Struktura serwisów

#### 2.1.1 AuthService (Injectable z signals)
- **Lokalizacja**: `src/app/core/services/auth.service.ts`
- **Odpowiedzialności**:
  - Zarządzanie stanem uwierzytelniania z Angular signals
  - Integracja z Supabase Auth
  - Obsługa rejestracji, logowania, wylogowania
  - Obsługa resetowania hasła
  - Reaktywne udostępnianie danych sesji

- **Signals-based state management**:
  ```typescript
  // Reactive state using signals
  private authState = signal<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  });

  // Computed signals for derived state
  readonly user = computed(() => this.authState().user);
  readonly isAuthenticated = computed(() => this.authState().isAuthenticated);
  readonly isLoading = computed(() => this.authState().isLoading);
  readonly error = computed(() => this.authState().error);
  ```

- **Kluczowe metody**:
  ```typescript
  // Rejestracja nowego użytkownika
  register(email: string, password: string): Promise<AuthResponse>
  
  // Logowanie użytkownika
  login(email: string, password: string): Promise<AuthResponse>
  
  // Wylogowanie użytkownika
  logout(): Promise<void>
  
  // Resetowanie hasła
  resetPassword(email: string): Promise<void>
  
  // Aktualizacja hasła
  updatePassword(newPassword: string): Promise<void>
  
  // Odświeżenie tokenu
  refreshToken(): Promise<AuthResponse>
  
  // Aktualizacja stanu z wykorzystaniem signals
  private updateAuthState(updates: Partial<AuthState>): void
  ```

#### 2.1.2 UserService (Injectable z inject pattern)
- **Lokalizacja**: `src/app/core/services/user.service.ts`
- **Odpowiedzialności**:
  - Zarządzanie profilami użytkowników w tabeli `public.users`
  - Synchronizacja danych z Supabase Auth
  - CRUD operacje na profilach użytkowników
  - Wykorzystanie istniejącego SupabaseService

- **Dependency injection**:
  ```typescript
  private readonly supabaseService = inject(SupabaseService);
  ```

- **Kluczowe metody**:
  ```typescript
  // Tworzenie profilu użytkownika po rejestracji
  createUserProfile(authUserId: string, email: string): Promise<UserProfile>
  
  // Pobranie profilu użytkownika (wykorzystuje istniejącą metodę)
  getUserProfile(): Promise<UserProfile>
  
  // Aktualizacja profilu użytkownika
  updateUserProfile(authUserId: string, updates: Partial<UserProfile>): Promise<UserProfile>
  
  // Usunięcie profilu użytkownika
  deleteUserProfile(authUserId: string): Promise<void>
  ```

### 2.2 Modele danych

#### 2.2.1 Wykorzystanie istniejących typów
Aplikacja wykorzystuje typy zdefiniowane w `src/types.ts`:
- `AuthUser` - dane użytkownika z Supabase Auth
- `AuthSession` - sesja użytkownika
- `AuthResponse` - odpowiedź z Supabase Auth
- `UserProfile` - profil użytkownika z tabeli public.users

#### 2.2.2 Nowe typy formularzy (do dodania w types.ts)
```typescript
// Formularz logowania
export interface LoginFormData {
  email: string;
  password: string;
}

// Formularz rejestracji
export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

// Formularz resetowania hasła
export interface ResetPasswordFormData {
  email: string;
}

// Formularz aktualizacji hasła
export interface UpdatePasswordFormData {
  password: string;
  confirmPassword: string;
}

// Stan uwierzytelniania dla signals
export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
```

### 2.3 Obsługa wyjątków

#### 2.3.1 AuthErrorHandler
- **Lokalizacja**: `src/app/core/handlers/auth-error.handler.ts`
- **Odpowiedzialności**:
  - Centralizowana obsługa błędów autentykacji
  - Mapowanie błędów Supabase na komunikaty użytkownika
  - Logowanie błędów do konsoli (dev) lub serwisu analitycznego (prod)

- **Typy błędów**:
  - `invalid_credentials` → "Nieprawidłowe dane logowania"
  - `user_already_registered` → "Użytkownik o podanym adresie email już istnieje"
  - `invalid_password` → "Hasło nie spełnia wymagań bezpieczeństwa"
  - `network_error` → "Wystąpił błąd sieci. Spróbuj ponownie."
  - `server_error` → "Wystąpił błąd serwera. Spróbuj ponownie później."

### 2.4 Integracja z Supabase

#### 2.4.1 SupabaseClient konfiguracja
- **Lokalizacja**: `src/app/core/config/supabase.config.ts`
- **Konfiguracja**:
  - URL i klucze z environment files
  - Konfiguracja automatycznego odświeżania tokenów
  - Obsługa event listeners dla zmian stanu auth

#### 2.4.2 Automatyczna synchronizacja profili
- **Trigger w bazie danych**: Automatyczne tworzenie rekordu w `public.users` po rejestracji w `auth.users`
- **Obsługa w aplikacji**: UserService nasłuchuje zmian w AuthService i synchronizuje dane profilu

## 3. SYSTEM AUTENTYKACJI

### 3.1 Architektura zabezpieczeń

#### 3.1.1 AuthGuard (Functional Guard z inject)
- **Lokalizacja**: `src/app/core/guards/auth.guard.ts`
- **Typ**: Functional Guard (nowoczesny Angular approach)
- **Funkcjonalność**:
  - Sprawdzenie stanu uwierzytelniania przed dostępem do tras
  - Przekierowanie niezalogowanych użytkowników na `/auth/login`
  - Zachowanie docelowej trasy w parametrach dla przekierowania po logowaniu

- **Implementacja z inject()**:
  ```typescript
  export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    // Wykorzystanie signals dla sprawdzenia stanu
    if (authService.isAuthenticated()) {
      return true;
    }
    
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  };
  ```

#### 3.1.2 GuestGuard (Functional Guard z inject)
- **Lokalizacja**: `src/app/core/guards/guest.guard.ts`
- **Funkcjonalność**:
  - Przekierowanie zalogowanych użytkowników z tras auth na `/sessions`
  - Zapobieganie dostępowi zalogowanych użytkowników do formularzy logowania/rejestracji

- **Implementacja z inject()**:
  ```typescript
  export const guestGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    if (!authService.isAuthenticated()) {
      return true;
    }
    
    router.navigate(['/sessions']);
    return false;
  };
  ```

### 3.2 Routing i ochrona tras

#### 3.2.1 Aktualizacja app.routes.ts (Standalone Components)
```typescript
export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [guestGuard],
    children: [
      { 
        path: 'login', 
        loadComponent: () => import('./features/auth/components/login/login.component').then(c => c.LoginComponent) 
      },
      { 
        path: 'register', 
        loadComponent: () => import('./features/auth/components/register/register.component').then(c => c.RegisterComponent) 
      },
      { 
        path: 'reset-password', 
        loadComponent: () => import('./features/auth/components/reset-password/reset-password.component').then(c => c.ResetPasswordComponent) 
      },
      { 
        path: 'update-password', 
        loadComponent: () => import('./features/auth/components/update-password/update-password.component').then(c => c.UpdatePasswordComponent) 
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'sessions',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./features/sessions/components/session-list/session-list.component').then(c => c.SessionListComponent)
      },
      {
        path: ':id',
        loadComponent: () => import('./features/sessions/components/session-details/session-details.component').then(c => c.SessionDetailsComponent)
      }
    ]
  },
  {
    path: '',
    redirectTo: '/sessions',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];
```

#### 3.2.2 Usunięcie modułów - wszystko standalone
Brak potrzeby tworzenia AuthModule - wszystkie komponenty są standalone i ładowane dynamicznie.

### 3.3 Zarządzanie stanem uwierzytelniania

#### 3.3.1 Stan zarządzany przez Signals (zamiast NgRx)
Wykorzystanie Angular signals w AuthService eliminuje potrzebę NgRx dla prostego stanu autentykacji:

- **Zalety signals nad NgRx w tym przypadku**:
  - Mniejsza złożożość dla prostego stanu auth
  - Lepsze performance z computed signals
  - Mniej boilerplate code
  - Lepsze tree-shaking

- **Stan zarządzany w AuthService**:
  ```typescript
  // Stan reactive zarządzany przez signals w AuthService
  private authState = signal<AuthState>({
    user: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    error: null
  });
  ```

#### 3.3.2 Persistencja sesji
- **Mechanizm**: Automatyczne zarządzanie przez Supabase Client
- **Storage**: LocalStorage dla refresh tokenów
- **Bezpieczeństwo**: Automatyczne wylogowanie po wygaśnięciu sesji

### 3.4 Zabezpieczenia Row Level Security (RLS)

#### 3.4.1 Istniejące policies
- **users**: Użytkownicy mogą zarządzać tylko swoimi profilami
- **sessions**: Użytkownicy widzą tylko swoje sesje treningowe
- **exercise_sets**: Użytkownicy mogą zarządzać tylko seriami w swoich sesjach
- **exercises**: Wszyscy użytkownicy mają dostęp do odczytu predefiniowanych ćwiczeń

#### 3.4.2 Dodatkowe zabezpieczenia
- **Walidacja po stronie serwera**: Supabase Edge Functions dla złożonych walidacji
- **Rate limiting**: Ograniczenie liczby prób logowania
- **Token validation**: Automatyczna walidacja tokenów JWT przez Supabase

### 3.5 Obsługa błędów i stanów loading

#### 3.5.1 Loading states
- **Komponenty**: Wskaźniki ładowania podczas operacji auth
- **Implementacja**: MatProgressSpinner z Angular Material
- **Stany**: login, register, logout, password reset

#### 3.5.2 Error handling
- **GlobalErrorHandler**: Centralna obsługa błędów aplikacji
- **AuthInterceptor**: HTTP interceptor dla automatycznego odświeżania tokenów
- **Toast notifications**: Komunikaty sukcesu/błędu używając MatSnackBar

## 4. STRUKTURA PLIKÓW I KATALOGÓW (Standalone Architecture)

```
src/app/
├── core/
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── user.service.ts
│   ├── guards/
│   │   ├── auth.guard.ts
│   │   └── guest.guard.ts
│   ├── interceptors/
│   │   └── auth.interceptor.ts
│   ├── handlers/
│   │   └── auth-error.handler.ts
│   └── config/
│       └── supabase.config.ts
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── login/
│   │   │   │   ├── login.component.ts (standalone)
│   │   │   │   ├── login.component.html
│   │   │   │   └── login.component.scss
│   │   │   ├── register/
│   │   │   │   ├── register.component.ts (standalone)
│   │   │   │   ├── register.component.html
│   │   │   │   └── register.component.scss
│   │   │   ├── reset-password/ (standalone)
│   │   │   └── update-password/ (standalone)
│   │   └── layouts/
│   │       └── auth-layout/
│   │           ├── auth-layout.component.ts (standalone)
│   │           ├── auth-layout.component.html
│   │           └── auth-layout.component.scss
│   └── sessions/ (istniejące, do konwersji na standalone)
├── shared/
│   ├── components/
│   │   └── error-dialog/
│   │       ├── error-dialog.component.ts (standalone)
│   │       ├── error-dialog.component.html
│   │       └── error-dialog.component.scss
│   └── layouts/
│       └── main-layout/
│           ├── main-layout.component.ts (standalone)
│           ├── main-layout.component.html
│           └── main-layout.component.scss
└── types.ts (rozszerzenie o typy auth)
```

## 5. WYMAGANIA IMPLEMENTACYJNE

### 5.1 Dodatkowe moduły Angular Material
- `MatMenuModule` - dla menu użytkownika w toolbar
- `MatSelectModule` - dla potencjalnych dropdown w formularzach
- `MatCheckboxModule` - dla checkboxów w formularzach

### 5.2 Konfiguracja environment
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseKey: 'YOUR_SUPABASE_ANON_KEY',
  appName: 'Unlazy',
  // inne konfiguracje auth
};
```

### 5.3 Integracja z istniejącym kodem
- **Konwersja na standalone**: Istniejące komponenty sesji do konwersji na standalone components
- **Dodanie AuthGuard**: Ochrona tras `/sessions` przez functional authGuard
- **Wykorzystanie istniejących serwisów**: AuthService będzie używał istniejącego SupabaseService
- **Aktualizacja app.component**: Integracja z layoutami auth/main jako standalone components
- **Rozszerzenie types.ts**: Dodanie typów formularzy auth do centralnego pliku typów

## 6. KOLEJNOŚĆ IMPLEMENTACJI

1. **Faza 1**: Konfiguracja podstawowa
   - Konfiguracja Supabase Client
   - Utworzenie AuthService i UserService
   - Implementacja podstawowych modeli danych

2. **Faza 2**: Komponenty UI
   - Implementacja LoginComponent i RegisterComponent
   - Utworzenie AuthLayoutComponent i MainLayoutComponent
   - Implementacja formularzy z walidacją

3. **Faza 3**: Zabezpieczenia
   - Implementacja AuthGuard i GuestGuard
   - Konfiguracja routing z ochroną tras
   - Obsługa błędów i stanów loading

4. **Faza 4**: Integracja
   - Integracja z istniejącymi komponentami sesji
   - Testowanie end-to-end przepływów użytkownika
   - Optymalizacja UX i obsługa edge cases

5. **Faza 5**: Finalizacja
   - Implementacja resetowania hasła
