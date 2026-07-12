-- The existing public.user_profile table (from the earlier JARVIS build that
-- shares this Supabase project) had no Row Level Security, so the public
-- anon key could read it with no authentication. Lock it down: zero policies
-- means only service_role (trusted backends) can still read/write it.
-- Scoped policies can be added later once this table's auth linkage is
-- revisited.

alter table public.user_profile enable row level security;
