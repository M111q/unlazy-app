-- ============================================================================
-- Migration: Update AI Summary Feature to Use Timestamp
-- Created: 2025-07-11 21:12:05 UTC
-- Purpose: Updates AI summary generation tracking from boolean flag to timestamp
--
-- Changes:
-- 1. Replace is_generating boolean with generating_started_at timestamp
-- 2. Update index for better performance with timestamp-based queries
-- 3. Add cleanup function for stale generation processes
--
-- Considerations:
-- - Existing is_generating=true records will be migrated to current timestamp
-- - The timestamp approach provides better visibility into stuck processes
-- - Cleanup function should be scheduled to run periodically
-- ============================================================================

-- drop existing index on is_generating column
drop index if exists public.idx_users_is_generating;

-- add new generating_started_at column
-- this timestamp tracks when AI generation started for timeout handling
alter table public.users
add column generating_started_at timestamp with time zone;

comment on column public.users.generating_started_at is 'Timestamp when AI summary generation started, NULL when no generation in progress';

-- migrate existing data: set timestamp for active generations
-- this ensures any in-progress generations are tracked with current time
update public.users
set generating_started_at = now()
where is_generating = true;

-- drop the old is_generating column
-- no longer needed with timestamp-based approach
alter table public.users
drop column is_generating;

-- create index for quickly finding users with active generation
-- partial index only includes rows where generation is in progress
create index idx_users_generating_started_at
on public.users(generating_started_at)
where generating_started_at is not null;

comment on index public.idx_users_generating_started_at is 'Index for quickly finding users with active AI generation operations';

-- create function to cleanup stale generation flags
-- this prevents indefinitely stuck generation processes
create or replace function public.cleanup_stale_generating_flags()
returns void as $$
begin
    -- reset generation timestamp for processes older than 5 minutes
    -- 5 minutes is well beyond the 30-second edge function timeout
    update public.users
    set generating_started_at = null
    where generating_started_at is not null
      and generating_started_at < now() - interval '5 minutes';
end;
$$ language plpgsql security definer;

comment on function public.cleanup_stale_generating_flags() is 'Cleans up stale AI generation flags older than 5 minutes';

-- note: to schedule this function, you can use pg_cron extension:
-- select cron.schedule('cleanup-stale-ai-flags', '*/5 * * * *', 'select public.cleanup_stale_generating_flags();');
-- or call it from your application's scheduled jobs
