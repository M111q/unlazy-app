-- ============================================================================
-- Migration: Add AI Summary Feature
-- Created: 2025-01-09 20:42:39 UTC
-- Purpose: Adds support for AI-generated session summaries
--
-- Changes:
-- 1. Add is_generating flag to users table (prevents concurrent AI operations)
-- 2. Add summary column to sessions table (stores AI-generated summaries)
-- 3. Add function and trigger to clear summaries when exercise sets change
--
-- Considerations:
-- - is_generating flag is per-user to prevent multiple concurrent operations
-- - summary is automatically cleared when exercise sets are modified
-- - summary is NOT cleared when session metadata is edited
-- ============================================================================

-- add is_generating flag to users table
-- this flag prevents users from generating multiple summaries simultaneously
alter table public.users
add column is_generating boolean not null default false;

comment on column public.users.is_generating is 'Flag to prevent concurrent AI summary generation operations per user';

-- add summary column to sessions table
-- stores ai-generated motivational summaries of training sessions
alter table public.sessions
add column summary text;

comment on column public.sessions.summary is 'AI-generated motivational summary of the training session';

-- create function to automatically clear session summary
-- this ensures summaries are invalidated when exercise data changes
create or replace function public.clear_session_summary()
returns trigger as $$
begin
    -- clear the summary when exercise sets are added or removed
    -- this ensures the summary always reflects current session data
    update public.sessions
    set summary = null
    where id = coalesce(new.session_id, old.session_id);

    -- return the appropriate row for the trigger
    return coalesce(new, old);
end;
$$ language plpgsql security definer;

comment on function public.clear_session_summary() is 'Automatically clears session summary when exercise sets are modified';

-- create trigger to invoke summary clearing function
-- fires after insert or delete operations on exercise_sets
create trigger trigger_clear_session_summary
    after insert or delete on public.exercise_sets
    for each row
    execute function public.clear_session_summary();

comment on trigger trigger_clear_session_summary on public.exercise_sets is 'Ensures session summaries are cleared when exercise sets change';

-- add index on is_generating for faster lookups
-- useful when checking if user can start new generation
create index idx_users_is_generating on public.users(is_generating) where is_generating = true;

comment on index public.idx_users_is_generating is 'Index for quickly finding users with active AI generation operations';
