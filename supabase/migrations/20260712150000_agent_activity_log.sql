-- Activity log for the sovereign agent team (see src/lib/agents/roster.ts).
-- Written by external agent backends (Slack bot, Jarvis, etc.) via the
-- POST /api/agents/log route using a shared bearer token — those services
-- don't have a K.I.V. user session, so this table is read here under the
-- normal authenticated-user policy but written via the service-role key.

create table public.agent_activity_log (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  action text not null,
  detail text,
  status text not null default 'info' check (status in ('info', 'success', 'warning', 'error')),
  created_at timestamptz not null default now()
);

create index agent_activity_log_agent_id_created_at_idx
  on public.agent_activity_log (agent_id, created_at desc);

alter table public.agent_activity_log enable row level security;

create policy "authenticated read agent_activity_log" on public.agent_activity_log
  for select to authenticated using (true);
