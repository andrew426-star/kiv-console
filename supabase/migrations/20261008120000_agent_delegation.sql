-- Work delegation to the Slack agents (src/lib/agents/delegation.ts).
-- Delegating a project or task to an agent is also Andrew's approval for
-- that agent to act on it without asking: delegate_actions lists the
-- acting tools approved for it, delegation_notes says what done looks
-- like. A task's own delegation wins; a task without one inherits its
-- project's. Agent ids are checked in the app, not here, since the roster
-- changes (src/lib/agents/roster.ts).

alter table public.projects
  add column delegate_agent_id text,
  add column delegate_actions text[] not null default '{}',
  add column delegation_notes text;

alter table public.tasks
  add column delegate_agent_id text,
  add column delegate_actions text[] not null default '{}',
  add column delegation_notes text,
  -- What the agent last did on this task, in its own words.
  add column agent_report text,
  add column agent_reported_at timestamptz;

create index projects_delegate_agent_id_idx on public.projects (delegate_agent_id)
  where delegate_agent_id is not null;
create index tasks_delegate_agent_id_idx on public.tasks (delegate_agent_id)
  where delegate_agent_id is not null;
