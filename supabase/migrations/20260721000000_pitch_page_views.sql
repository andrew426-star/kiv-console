-- Append-only view log for public /pitch/[slug] landing pages — operational,
-- high-frequency data Sheets is a poor fit for (no atomic counter, quota
-- cost), same precedent as agent_activity_log. Written exclusively by the
-- public page's Server Component via the service-role key (no K.I.V. user
-- session exists there); read here under the normal authenticated policy.

create table public.pitch_page_views (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  company_name text not null,
  viewed_at timestamptz not null default now()
);

create index pitch_page_views_slug_viewed_at_idx
  on public.pitch_page_views (slug, viewed_at desc);

alter table public.pitch_page_views enable row level security;

create policy "authenticated read pitch_page_views" on public.pitch_page_views
  for select to authenticated using (true);
