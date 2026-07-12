-- K.I.V. Foundation schema: profiles, clients, projects, tasks, deliverables.
-- Powers the Company Dashboard module (Command Center, Team Board,
-- User Management, Kanban Client Portal).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user, extends auth.users with role info
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'contractor', 'viewer')),
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new user signs up via Supabase Auth.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'viewer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- clients: companies/engagements Kivaro AI is delivering work for
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'prospect'
    check (status in ('prospect', 'active', 'paused', 'completed')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- projects: internal or client-facing initiatives
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  description text,
  status text not null default 'planning'
    check (status in ('planning', 'active', 'blocked', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

create index projects_client_id_idx on public.projects (client_id);
create index projects_owner_id_idx on public.projects (owner_id);

-- ---------------------------------------------------------------------------
-- tasks: work items tied to a project, assigned to a profile (Team Board)
-- ---------------------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  assignee_id uuid references public.profiles (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'blocked', 'done')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);

-- ---------------------------------------------------------------------------
-- deliverables: Kanban cards for the Client Portal board
-- ---------------------------------------------------------------------------
create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  stage text not null default 'backlog'
    check (stage in ('backlog', 'in_progress', 'review', 'delivered')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index deliverables_client_id_idx on public.deliverables (client_id);
create index deliverables_project_id_idx on public.deliverables (project_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger deliverables_set_updated_at
  before update on public.deliverables
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: baseline is "any authenticated Kivaro user can read/write everything".
-- This is a two-person internal tool today; per-role restrictions (e.g.
-- contractors read-only on financials) land in the Phase 1 "Auth/roles
-- hardening" step, not here.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.deliverables enable row level security;

create policy "authenticated read profiles" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using (id = auth.uid());

create policy "authenticated full access clients" on public.clients
  for all to authenticated using (true) with check (true);
create policy "authenticated full access projects" on public.projects
  for all to authenticated using (true) with check (true);
create policy "authenticated full access tasks" on public.tasks
  for all to authenticated using (true) with check (true);
create policy "authenticated full access deliverables" on public.deliverables
  for all to authenticated using (true) with check (true);
