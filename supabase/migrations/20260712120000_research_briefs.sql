-- Research module: stores each generated daily brief so the page can show
-- a real "generated at" timestamp and avoid re-calling Claude on every
-- page load. Same baseline access pattern as the rest of the app (any
-- authenticated Kivaro user can read/write).

create table public.research_briefs (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  generated_at timestamptz not null default now()
);

alter table public.research_briefs enable row level security;

create policy "authenticated full access research_briefs" on public.research_briefs
  for all to authenticated using (true) with check (true);
