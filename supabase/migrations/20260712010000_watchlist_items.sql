-- Intel Hub's interactive watchlist. Shared across the team, same
-- baseline access pattern as the rest of the Foundation tables
-- (any authenticated Kivaro user can read/write).

create table public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique,
  label text not null,
  created_at timestamptz not null default now()
);

alter table public.watchlist_items enable row level security;

create policy "authenticated full access watchlist_items" on public.watchlist_items
  for all to authenticated using (true) with check (true);
