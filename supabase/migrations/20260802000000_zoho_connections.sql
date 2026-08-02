-- One Zoho Mail OAuth connection per profile. Genuinely separate from
-- calendar_connections (Google) — its own Zoho API Console app grant, its
-- own refresh token, its own mailbox (andrew.thomas@kivaroai.com). Used
-- exclusively by Pipeline's outreach-send capability: send-only scope
-- (ZohoMail.messages.CREATE), no inbox read access. account_id is Zoho's
-- own account identifier, resolved once at connect time (GET
-- /api/accounts) and cached here since every Zoho Mail API call needs it.
-- Same service_role-only lockdown as calendar_connections — this table
-- holds a live real-email-send credential.

create table public.zoho_connections (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email_address text not null,
  account_id text not null,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger zoho_connections_set_updated_at
  before update on public.zoho_connections
  for each row execute function public.set_updated_at();

alter table public.zoho_connections enable row level security;
revoke all on public.zoho_connections from anon, authenticated;
