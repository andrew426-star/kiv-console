-- Launch tracker for Kivaro AI's January 2027 launch (see
-- src/lib/launch/plan.ts for the phases and targets these rows count
-- against). One row per real thing that happened: a conversation with a
-- prospect, a pilot started, a paid commitment, a publicity action, or a
-- published piece of content. Written from the /launch page (user
-- session), by the Slack agents (service role, src/lib/agents/tools/launch.ts)
-- and by Jarvis (service role, app/tools/launch_tracker.py in the jarvis repo).

create table public.launch_activity (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('conversation', 'pilot', 'commitment', 'publicity', 'content')),
  company text,
  contact text,
  segment text check (
    segment in (
      'hedge_fund',
      'research_analytics',
      'investor_relations',
      'quant',
      'venture_capital',
      'private_equity'
    )
  ),
  notes text,
  occurred_on date not null default current_date,
  logged_by text not null default 'andrew',
  created_at timestamptz not null default now()
);

create index launch_activity_kind_occurred_on_idx
  on public.launch_activity (kind, occurred_on desc);

alter table public.launch_activity enable row level security;

create policy "authenticated full access launch_activity" on public.launch_activity
  for all to authenticated using (true) with check (true);
