-- =====================================================
-- Unlazy Fitness App - Database Schema Migration
-- =====================================================
-- Purpose: Create complete database schema for fitness tracking application
-- Affected tables: users, exercises, sessions, exercise_sets
-- Special considerations:
--   - Row Level Security enabled on all tables
--   - Business logic constraints via triggers
--   - Optimized indexes for performance
--   - Seed data for predefined exercises
-- Migration date: 2025-06-14
-- =====================================================

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- -----------------------------------------------------
-- 1.1 users table
-- Purpose: Store user profiles linked to Supabase Auth
-- Relationship: 1:1 with auth.users
-- -----------------------------------------------------
create table public.users (
    id serial primary key,
    auth_user_id uuid not null references auth.users(id) on delete cascade,
    email varchar(255) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    unique(auth_user_id)
);

-- Enable row level security for users table
alter table public.users enable row level security;

-- Add comment to users table
comment on table public.users is 'User profiles linked to Supabase Auth users';
comment on column public.users.auth_user_id is 'Foreign key to auth.users table';
comment on column public.users.email is 'User email address from auth system';

-- -----------------------------------------------------
-- 1.2 exercises table
-- Purpose: Store predefined exercise definitions
-- Access: Global read access for all users
-- -----------------------------------------------------
create table public.exercises (
    id serial primary key,
    name varchar(100) not null unique,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now()
);

-- Enable row level security for exercises table
alter table public.exercises enable row level security;

-- Add comment to exercises table
comment on table public.exercises is 'Predefined exercise definitions available to all users';
comment on column public.exercises.name is 'Unique exercise name';

-- -----------------------------------------------------
-- 1.3 sessions table
-- Purpose: Store user workout sessions
-- Business rules: Max 3 sessions per day per user
-- -----------------------------------------------------
create table public.sessions (
    id serial primary key,
    user_id integer not null references public.users(id) on delete cascade,
    session_datetime timestamp not null,
    description varchar(260),
    location varchar(160),
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),

    -- Business constraint: description length limit
    constraint check_description_length check (length(description) <= 260),

    -- Business constraint: location length limit
    constraint check_location_length check (length(location) <= 160)
);

-- Create unique index to prevent duplicate sessions in same minute
create unique index idx_sessions_user_minute
on public.sessions (user_id, date_trunc('minute', session_datetime));

-- Enable row level security for sessions table
alter table public.sessions enable row level security;

-- Add comments to sessions table
comment on table public.sessions is 'User workout sessions with datetime and optional metadata';
comment on column public.sessions.user_id is 'Foreign key to users table';
comment on column public.sessions.session_datetime is 'Date and time when session occurred';
comment on column public.sessions.description is 'Optional session description (max 260 chars)';
comment on column public.sessions.location is 'Optional session location (max 160 chars)';

-- -----------------------------------------------------
-- 1.4 exercise_sets table
-- Purpose: Store individual exercise sets within sessions
-- Business rules: Max 50 sets per session, weight 1-400kg, reps 1-300
-- -----------------------------------------------------
create table public.exercise_sets (
    id serial primary key,
    session_id integer not null references public.sessions(id) on delete cascade,
    exercise_id integer not null references public.exercises(id) on delete cascade,
    reps integer not null,
    weight integer not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),

    -- Business constraint: repetitions range validation
    constraint check_reps_range check (reps >= 1 and reps <= 300),

    -- Business constraint: weight range validation
    constraint check_weight_range check (weight >= 1 and weight <= 400)
);

-- Enable row level security for exercise_sets table
alter table public.exercise_sets enable row level security;

-- Add comments to exercise_sets table
comment on table public.exercise_sets is 'Individual exercise sets performed within workout sessions';
comment on column public.exercise_sets.session_id is 'Foreign key to sessions table';
comment on column public.exercise_sets.exercise_id is 'Foreign key to exercises table';
comment on column public.exercise_sets.reps is 'Number of repetitions (1-300)';
comment on column public.exercise_sets.weight is 'Weight used in kg (1-400)';

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary index for user session pagination (most common query pattern)
create index idx_sessions_user_datetime
on public.sessions (user_id, session_datetime desc);

-- Index for exercise sets lookup within sessions
create index idx_exercise_sets_session
on public.exercise_sets (session_id);

-- Index for exercise sets by exercise type (for statistics)
create index idx_exercise_sets_exercise
on public.exercise_sets (exercise_id);

-- =====================================================
-- 3. CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- -----------------------------------------------------
-- 3.1 Function: Auto-update updated_at timestamp
-- Purpose: Automatically set updated_at on record updates
-- -----------------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Add comment to function
comment on function public.update_updated_at_column() is 'Automatically updates updated_at timestamp on record modification';

-- -----------------------------------------------------
-- 3.2 Triggers: Apply updated_at function to all tables
-- -----------------------------------------------------

-- Trigger for users table
create trigger trigger_users_updated_at
    before update on public.users
    for each row
    execute function public.update_updated_at_column();

-- Trigger for exercises table
create trigger trigger_exercises_updated_at
    before update on public.exercises
    for each row
    execute function public.update_updated_at_column();

-- Trigger for sessions table
create trigger trigger_sessions_updated_at
    before update on public.sessions
    for each row
    execute function public.update_updated_at_column();

-- Trigger for exercise_sets table
create trigger trigger_exercise_sets_updated_at
    before update on public.exercise_sets
    for each row
    execute function public.update_updated_at_column();

-- -----------------------------------------------------
-- 3.3 Function: Check daily session limit
-- Purpose: Enforce max 3 sessions per day per user
-- -----------------------------------------------------
create or replace function public.check_daily_session_limit()
returns trigger as $$
declare
    session_count integer;
    session_date date;
begin
    -- Extract date from session_datetime
    session_date := date(new.session_datetime);

    -- Count existing sessions for user on this date
    select count(*)
    into session_count
    from public.sessions
    where user_id = new.user_id
    and date(session_datetime) = session_date
    and (tg_op = 'INSERT' or id != new.id); -- Exclude current record on update

    -- Enforce limit
    if session_count >= 3 then
        raise exception 'Daily session limit exceeded (maximum 3 sessions per day)';
    end if;

    return new;
end;
$$ language plpgsql;

-- Add comment to function
comment on function public.check_daily_session_limit() is 'Enforces business rule: maximum 3 workout sessions per day per user';

-- Trigger for daily session limit
create trigger trigger_check_daily_session_limit
    before insert or update on public.sessions
    for each row
    execute function public.check_daily_session_limit();

-- -----------------------------------------------------
-- 3.4 Function: Check session sets limit
-- Purpose: Enforce max 50 sets per session
-- -----------------------------------------------------
create or replace function public.check_session_sets_limit()
returns trigger as $$
declare
    sets_count integer;
begin
    -- Count existing sets in session
    select count(*)
    into sets_count
    from public.exercise_sets
    where session_id = new.session_id
    and (tg_op = 'INSERT' or id != new.id); -- Exclude current record on update

    -- Enforce limit
    if sets_count >= 50 then
        raise exception 'Session sets limit exceeded (maximum 50 sets per session)';
    end if;

    return new;
end;
$$ language plpgsql;

-- Add comment to function
comment on function public.check_session_sets_limit() is 'Enforces business rule: maximum 50 exercise sets per workout session';

-- Trigger for session sets limit
create trigger trigger_check_session_sets_limit
    before insert or update on public.exercise_sets
    for each row
    execute function public.check_session_sets_limit();

-- =====================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- -----------------------------------------------------
-- 4.1 Users table policies
-- Purpose: Users can only access their own profile data
-- -----------------------------------------------------

-- Policy: authenticated users can select their own profile
create policy "users_select_own" on public.users
    for select
    to authenticated
    using (auth_user_id = auth.uid());

-- Policy: authenticated users can insert their own profile
create policy "users_insert_own" on public.users
    for insert
    to authenticated
    with check (auth_user_id = auth.uid());

-- Policy: authenticated users can update their own profile
create policy "users_update_own" on public.users
    for update
    to authenticated
    using (auth_user_id = auth.uid())
    with check (auth_user_id = auth.uid());

-- Policy: authenticated users can delete their own profile
create policy "users_delete_own" on public.users
    for delete
    to authenticated
    using (auth_user_id = auth.uid());

-- -----------------------------------------------------
-- 4.2 Exercises table policies
-- Purpose: Global read access, no write access for users
-- -----------------------------------------------------

-- Policy: anonymous users can select exercises
create policy "exercises_select_anon" on public.exercises
    for select
    to anon
    using (true);

-- Policy: authenticated users can select exercises
create policy "exercises_select_auth" on public.exercises
    for select
    to authenticated
    using (true);

-- Policy: restrict all write operations for anonymous users
create policy "exercises_restrict_anon" on public.exercises
    for all
    to anon
    using (false);

-- Policy: restrict all write operations for authenticated users
create policy "exercises_restrict_auth" on public.exercises
    for all
    to authenticated
    using (false);

-- -----------------------------------------------------
-- 4.3 Sessions table policies
-- Purpose: Users can only access their own sessions
-- -----------------------------------------------------

-- Policy: authenticated users can select their own sessions
create policy "sessions_select_own" on public.sessions
    for select
    to authenticated
    using (
        user_id in (
            select id from public.users where auth_user_id = auth.uid()
        )
    );

-- Policy: authenticated users can insert their own sessions
create policy "sessions_insert_own" on public.sessions
    for insert
    to authenticated
    with check (
        user_id in (
            select id from public.users where auth_user_id = auth.uid()
        )
    );

-- Policy: authenticated users can update their own sessions
create policy "sessions_update_own" on public.sessions
    for update
    to authenticated
    using (
        user_id in (
            select id from public.users where auth_user_id = auth.uid()
        )
    )
    with check (
        user_id in (
            select id from public.users where auth_user_id = auth.uid()
        )
    );

-- Policy: authenticated users can delete their own sessions
create policy "sessions_delete_own" on public.sessions
    for delete
    to authenticated
    using (
        user_id in (
            select id from public.users where auth_user_id = auth.uid()
        )
    );

-- -----------------------------------------------------
-- 4.4 Exercise sets table policies
-- Purpose: Users can only access sets from their own sessions
-- -----------------------------------------------------

-- Policy: authenticated users can select their own exercise sets
create policy "exercise_sets_select_own" on public.exercise_sets
    for select
    to authenticated
    using (
        session_id in (
            select s.id from public.sessions s
            join public.users u on s.user_id = u.id
            where u.auth_user_id = auth.uid()
        )
    );

-- Policy: authenticated users can insert exercise sets in their own sessions
create policy "exercise_sets_insert_own" on public.exercise_sets
    for insert
    to authenticated
    with check (
        session_id in (
            select s.id from public.sessions s
            join public.users u on s.user_id = u.id
            where u.auth_user_id = auth.uid()
        )
    );

-- Policy: authenticated users can update their own exercise sets
create policy "exercise_sets_update_own" on public.exercise_sets
    for update
    to authenticated
    using (
        session_id in (
            select s.id from public.sessions s
            join public.users u on s.user_id = u.id
            where u.auth_user_id = auth.uid()
        )
    )
    with check (
        session_id in (
            select s.id from public.sessions s
            join public.users u on s.user_id = u.id
            where u.auth_user_id = auth.uid()
        )
    );

-- Policy: authenticated users can delete their own exercise sets
create policy "exercise_sets_delete_own" on public.exercise_sets
    for delete
    to authenticated
    using (
        session_id in (
            select s.id from public.sessions s
            join public.users u on s.user_id = u.id
            where u.auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- 5. SEED DATA - PREDEFINED EXERCISES
-- =====================================================

-- Insert 20 common fitness exercises for users to choose from
-- These represent the most popular exercises in fitness training
insert into public.exercises (name) values
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

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary of created objects:
-- - 4 tables: users, exercises, sessions, exercise_sets
-- - 3 performance indexes
-- - 4 functions: updated_at, daily limit, session limit
-- - 8 triggers: 4 for updated_at, 2 for business rules
-- - 16 RLS policies: granular access control per table
-- - 20 seed exercise records
-- =====================================================
