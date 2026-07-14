-- Client pipeline redesign: Prospects (live from the ALE Sales Pitch Log
-- spreadsheet, not stored here) -> Leads -> Clients. `clients.status` drops
-- 'prospect' (prospects aren't Supabase rows at all anymore) and adds
-- 'lead'. Table is empty in production, so this is a plain constraint swap,
-- no data migration needed.

alter table public.clients drop constraint if exists clients_status_check;
alter table public.clients add constraint clients_status_check
  check (status in ('lead', 'active', 'paused', 'completed'));
alter table public.clients alter column status set default 'lead';

-- Traceability back to the ALE lead a client originated from, when
-- applicable — set when a Prospect is promoted to Lead.
alter table public.clients add column source text not null default 'manual'
  check (source in ('manual', 'ale'));
alter table public.clients add column ale_doc_url text;
