# Schemat Bazy Danych - Unlazy

## 1. Tabele

### 1.1 users
Tabela użytkowników zarządzana przez Supabase Auth.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(auth_user_id)
);
```

### 1.2 exercises
Tabela predefiniowanych ćwiczeń.

```sql
CREATE TABLE exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 1.3 sessions
Tabela sesji treningowych użytkowników.

```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_datetime TIMESTAMP NOT NULL,
    description VARCHAR(260),
    location VARCHAR(160),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Check constraints dla ograniczeń biznesowych
    CONSTRAINT check_description_length CHECK (LENGTH(description) <= 260),
    CONSTRAINT check_location_length CHECK (LENGTH(location) <= 160),
    
    -- Unique constraint zapobiegający duplikatom sesji w tej samej minucie
    UNIQUE(user_id, DATE_TRUNC('minute', session_datetime))
);
```

### 1.4 exercise_sets
Tabela serii ćwiczeń w ramach sesji treningowych.

```sql
CREATE TABLE exercise_sets (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    reps INTEGER NOT NULL,
    weight INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    -- Check constraints dla ograniczeń biznesowych
    CONSTRAINT check_reps_range CHECK (reps >= 1 AND reps <= 300),
    CONSTRAINT check_weight_range CHECK (weight >= 1 AND weight <= 400)
);
```

## 2. Relacje między tabelami

### 2.1 Kardynalność relacji
- **users ↔ auth.users**: Jeden-do-jednego (1:1)
- **users → sessions**: Jeden-do-wielu (1:N)
- **sessions → exercise_sets**: Jeden-do-wielu (1:N)
- **exercises → exercise_sets**: Jeden-do-wielu (1:N)

### 2.2 Foreign Keys
- `users.auth_user_id` → `auth.users.id` (ON DELETE CASCADE)
- `sessions.user_id` → `users.id` (ON DELETE CASCADE)
- `exercise_sets.session_id` → `sessions.id` (ON DELETE CASCADE)
- `exercise_sets.exercise_id` → `exercises.id` (ON DELETE CASCADE)

## 3. Indeksy

### 3.1 Indeksy wydajnościowe

```sql
-- Główny indeks dla paginacji sesji użytkownika
CREATE INDEX idx_sessions_user_datetime 
ON sessions (user_id, session_datetime DESC);

-- Indeks dla optymalizacji zapytań o serie w sesji
CREATE INDEX idx_exercise_sets_session 
ON exercise_sets (session_id);

-- Indeks dla relacji exercises-exercise_sets
CREATE INDEX idx_exercise_sets_exercise 
ON exercise_sets (exercise_id);
```

## 4. Funkcje i Triggery

### 4.1 Funkcja aktualizacji updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.2 Triggery updated_at

```sql
-- Trigger dla tabeli users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger dla tabeli exercises
CREATE TRIGGER trigger_exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger dla tabeli sessions
CREATE TRIGGER trigger_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger dla tabeli exercise_sets
CREATE TRIGGER trigger_exercise_sets_updated_at
    BEFORE UPDATE ON exercise_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4.3 Funkcja sprawdzania limitu sesji dziennych

```sql
CREATE OR REPLACE FUNCTION check_daily_session_limit()
RETURNS TRIGGER AS $$
DECLARE
    session_count INTEGER;
    session_date DATE;
BEGIN
    -- Wyciągnij datę z session_datetime
    session_date := DATE(NEW.session_datetime);
    
    -- Policz istniejące sesje użytkownika w tym dniu
    SELECT COUNT(*)
    INTO session_count
    FROM sessions
    WHERE user_id = NEW.user_id
    AND DATE(session_datetime) = session_date
    AND (TG_OP = 'INSERT' OR id != NEW.id); -- Wyłącz aktualny rekord przy UPDATE
    
    -- Sprawdź limit
    IF session_count >= 3 THEN
        RAISE EXCEPTION 'Przekroczono dzienny limit sesji (maksymalnie 3 sesje na dzień)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.4 Trigger sprawdzania limitu sesji dziennych

```sql
CREATE TRIGGER trigger_check_daily_session_limit
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION check_daily_session_limit();
```

### 4.5 Funkcja sprawdzania limitu serii w sesji

```sql
CREATE OR REPLACE FUNCTION check_session_sets_limit()
RETURNS TRIGGER AS $$
DECLARE
    sets_count INTEGER;
BEGIN
    -- Policz istniejące serie w sesji
    SELECT COUNT(*)
    INTO sets_count
    FROM exercise_sets
    WHERE session_id = NEW.session_id
    AND (TG_OP = 'INSERT' OR id != NEW.id); -- Wyłącz aktualny rekord przy UPDATE
    
    -- Sprawdź limit
    IF sets_count >= 50 THEN
        RAISE EXCEPTION 'Przekroczono limit serii w sesji (maksymalnie 50 serii na sesję)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4.6 Trigger sprawdzania limitu serii w sesji

```sql
CREATE TRIGGER trigger_check_session_sets_limit
    BEFORE INSERT OR UPDATE ON exercise_sets
    FOR EACH ROW
    EXECUTE FUNCTION check_session_sets_limit();
```

## 5. Row Level Security (RLS)

### 5.1 Włączenie RLS na tabelach

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_sets ENABLE ROW LEVEL SECURITY;
-- exercises bez RLS - globalny dostęp do odczytu
```

### 5.2 Polityki RLS

```sql
-- Polityka dla tabeli users
CREATE POLICY users_policy ON users
    USING (auth_user_id = auth.uid());

-- Polityka dla tabeli sessions
CREATE POLICY sessions_policy ON sessions
    USING (
        user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- Polityka dla tabeli exercise_sets
CREATE POLICY exercise_sets_policy ON exercise_sets
    USING (
        session_id IN (
            SELECT s.id FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
        )
    );

-- Globalna polityka dla exercises (tylko SELECT)
CREATE POLICY exercises_select_policy ON exercises
    FOR SELECT
    USING (true);

-- Zabronij wszystkich innych operacji na exercises dla użytkowników
CREATE POLICY exercises_restrict_policy ON exercises
    FOR ALL
    USING (false);
```

## 6. Dane Seed - Ćwiczenia

### 6.1 20 podstawowych ćwiczeń

```sql
INSERT INTO exercises (name) VALUES
    ('Wyciskanie sztangi na ławce płaskiej'),
    ('Przysiad ze sztangą'),
    ('Martwy ciąg'),
    ('Wyciskanie sztangi nad głową'),
    ('Podciąganie na drążku'),
    ('Pompki'),
    ('Wiosłowanie sztangą w opadzie'),
    ('Dipsy na poręczach'),
    ('Uginanie ramion ze sztangą'),
    ('Francuskie wyciskanie'),
    ('Przysiad z hantlami'),
    ('Wyciskanie hantli na ławce'),
    ('Unoszenie ramion w bok z hantlami'),
    ('Wspięcia na palce'),
    ('Plank'),
    ('Brzuszki'),
    ('Wypady z hantlami'),
    ('Wznosy na biceps z hantlami'),
    ('Triceps z linką'),
    ('Himalaje');
```

## 7. Zapytania przykładowe dla statystyk

### 7.1 Statystyki sesji (suma kg i powtórzeń)

```sql
-- Statystyki dla konkretnej sesji
SELECT 
    s.id,
    s.session_datetime,
    s.description,
    s.location,
    COALESCE(SUM(es.weight_kg), 0) as total_weight,
    COALESCE(SUM(es.reps), 0) as total_reps
FROM sessions s
LEFT JOIN exercise_sets es ON s.id = es.session_id
WHERE s.id = $1
GROUP BY s.id, s.session_datetime, s.description, s.location;
```

### 7.2 Lista sesji z paginacją i statystykami

```sql
-- Lista sesji użytkownika z statystykami
SELECT 
    s.id,
    s.session_datetime,
    s.description,
    s.location,
    COALESCE(SUM(es.weight_kg), 0) as total_weight,
    COALESCE(SUM(es.reps), 0) as total_reps
FROM sessions s
LEFT JOIN exercise_sets es ON s.id = es.session_id
WHERE s.user_id = $1
GROUP BY s.id, s.session_datetime, s.description, s.location
ORDER BY s.session_datetime DESC
LIMIT $2 OFFSET $3;
```

## 8. Uwagi projektowe

### 8.1 Decyzje architektoniczne
- Statystyki obliczane dynamicznie przy zapytaniach dla zapewnienia spójności danych
- SERIAL zamiast UUID dla primary keys ze względu na prostotę i wydajność
- TIMESTAMP bez timezone dla uproszczenia (kontekst tylko polski)
- Separate users table dla przyszłej rozszerzalności profili użytkowników

### 8.2 Bezpieczeństwo
- RLS zapewnia izolację danych między użytkownikami
- Foreign keys z CASCADE dla zachowania integralności referncyjnej
- Check constraints dla walidacji na poziomie bazy danych

### 8.3 Wydajność
- Composite index (user_id, session_datetime DESC) optymalizuje główny use case paginacji
- Minimalna liczba indeksów na start, więcej można dodać w razie potrzeby
- Triggery sprawdzające limity biznesowe przed wstawianiem/aktualizacją

### 8.4 Skalowalność
- Struktura przygotowana na przyszłe rozszerzenia (kategorie ćwiczeń, grupy mięśniowe)
- Normalizacja do 3NF z wyjątkiem obliczanych statystyk
- Możliwość dodania audit trails i soft delete w przyszłości
