# Database Changes Plan

This document outlines planned changes and improvements to the database schema and logic.

## High Priority

- Implement database trigger `on_auth_user_created` to automatically create a corresponding record in `public.users` when a new user registers in `auth.users`. This ensures atomicity and data consistency.

## Medium Priority

- Review current Supabase `createSession` and `getCurrentUserId` methods to ensure they handle the transition smoothly until the database trigger is fully in place.

## Low Priority

- Optimize query performance for frequently accessed data (e.g., sessions with stats).
- Add database indices where necessary.

## Ideas / Future Enhancements

- Explore using Supabase RPC functions for complex transactions (e.g., session creation with initial sets).
- Investigate Supabase Edge Functions for handling specific backend logic or external API calls.