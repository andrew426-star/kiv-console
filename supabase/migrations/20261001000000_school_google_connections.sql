-- Andrew's Louisiana Tech Google account (agt537@email.latech.edu), as a
-- second, read-only Google connection next to calendar_connections. Kept
-- in its own table rather than adding rows to calendar_connections: that
-- table is K.I.V.'s Workspace grant (ALE, Drive, Sheets, Gmail send), and
-- getWorkspaceAccessToken() reads its first row — a second row there could
-- hand ALE the school account. Scopes are calendar.readonly +
-- gmail.metadata + userinfo.email only: K.I.V. reads the school calendar
-- and inbox headers, it never writes or sends as the school account.
-- Same service_role-only lockdown as calendar_connections.

create table public.school_google_connections (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger school_google_connections_set_updated_at
  before update on public.school_google_connections
  for each row execute function public.set_updated_at();

alter table public.school_google_connections enable row level security;
revoke all on public.school_google_connections from anon, authenticated;
