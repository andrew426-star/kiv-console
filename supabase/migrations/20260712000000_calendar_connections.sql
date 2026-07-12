-- One Google Calendar OAuth connection per profile. Holds refresh/access
-- tokens, so it's service_role-only (same lockdown pattern as
-- user_profile): RLS on, zero policies, no anon/authenticated grants.
-- Only server-side code using the service_role client may touch this
-- table, and only for the current session's own profile id — never a
-- client-supplied one.

create table public.calendar_connections (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  calendar_email text not null,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger calendar_connections_set_updated_at
  before update on public.calendar_connections
  for each row execute function public.set_updated_at();

alter table public.calendar_connections enable row level security;
revoke all on public.calendar_connections from anon, authenticated;
