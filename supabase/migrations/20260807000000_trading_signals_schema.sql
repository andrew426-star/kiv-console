-- Algorithmic trading Tier 1: signal generation, backtesting, and risk
-- management — 100% advisory, no order-execution capability exists
-- anywhere in this codebase (see src/lib/portfolio/alpaca.ts's guardrail
-- comment). Audit-relevant tables follow agent_activity_log's RLS
-- convention (authenticated read, service-role-only write via
-- createAdminClient()) rather than watchlist_items's fully-open pattern,
-- since this is materially more sensitive data — every signal and every
-- approve/reject decision is written here so nothing is silently dropped.

create table public.trading_strategies (
  id text primary key,
  name text not null,
  description text not null,
  default_params jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger trading_strategies_set_updated_at
  before update on public.trading_strategies
  for each row execute function public.set_updated_at();

create table public.trading_signals (
  id uuid primary key default gen_random_uuid(),
  strategy_id text not null references public.trading_strategies (id),
  symbol text not null,
  asset_class text not null check (asset_class in ('stocks', 'crypto', 'metals', 'futures')),
  direction text not null check (direction in ('long', 'short')),
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  entry numeric not null,
  stop numeric not null,
  target numeric not null,
  rationale jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index trading_signals_symbol_created_at_idx on public.trading_signals (symbol, created_at desc);
create index trading_signals_strategy_id_idx on public.trading_signals (strategy_id);

create table public.trading_decisions (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.trading_signals (id) on delete cascade,
  approved boolean not null,
  reasons jsonb not null default '[]'::jsonb,
  position_size_usd numeric not null default 0,
  position_size_qty numeric not null default 0,
  created_at timestamptz not null default now()
);

create index trading_decisions_signal_id_idx on public.trading_decisions (signal_id);

create table public.trading_backtest_runs (
  id uuid primary key default gen_random_uuid(),
  strategy_id text not null references public.trading_strategies (id),
  symbol text not null,
  asset_class text not null check (asset_class in ('stocks', 'crypto', 'metals', 'futures')),
  window_days integer not null,
  step_days integer not null,
  transaction_cost_bps numeric not null,
  total_trades integer not null default 0,
  win_rate_pct numeric,
  profit_factor numeric,
  sharpe_ratio numeric,
  max_drawdown_pct numeric,
  total_return_pct numeric not null default 0,
  created_at timestamptz not null default now()
);

create index trading_backtest_runs_symbol_strategy_idx
  on public.trading_backtest_runs (symbol, strategy_id, created_at desc);

create table public.trading_backtest_trades (
  id uuid primary key default gen_random_uuid(),
  backtest_run_id uuid not null references public.trading_backtest_runs (id) on delete cascade,
  direction text not null check (direction in ('long', 'short')),
  entry_at timestamptz not null,
  entry_price numeric not null,
  exit_at timestamptz not null,
  exit_price numeric not null,
  exit_reason text not null check (exit_reason in ('stop', 'target', 'end_of_data')),
  pnl_pct numeric not null,
  pnl_usd numeric not null
);

create index trading_backtest_trades_run_id_idx on public.trading_backtest_trades (backtest_run_id);

-- Singleton fail-closed kill switch — checked first by every scan/backtest
-- run (src/lib/trading/risk/kill-switch.ts). Gets its own direct
-- authenticated UPDATE policy (unlike every other table in this file) so
-- a human can halt trading from the K.I.V. UI without a deploy.
create table public.trading_kill_switch (
  id text primary key default 'default',
  enabled boolean not null default false,
  reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id)
);

create trigger trading_kill_switch_set_updated_at
  before update on public.trading_kill_switch
  for each row execute function public.set_updated_at();

insert into public.trading_kill_switch (id, enabled, reason) values ('default', false, null);

alter table public.trading_strategies enable row level security;
alter table public.trading_signals enable row level security;
alter table public.trading_decisions enable row level security;
alter table public.trading_backtest_runs enable row level security;
alter table public.trading_backtest_trades enable row level security;
alter table public.trading_kill_switch enable row level security;

create policy "authenticated read trading_strategies" on public.trading_strategies
  for select to authenticated using (true);

create policy "authenticated read trading_signals" on public.trading_signals
  for select to authenticated using (true);

create policy "authenticated read trading_decisions" on public.trading_decisions
  for select to authenticated using (true);

create policy "authenticated read trading_backtest_runs" on public.trading_backtest_runs
  for select to authenticated using (true);

create policy "authenticated read trading_backtest_trades" on public.trading_backtest_trades
  for select to authenticated using (true);

create policy "authenticated read trading_kill_switch" on public.trading_kill_switch
  for select to authenticated using (true);

create policy "authenticated update trading_kill_switch" on public.trading_kill_switch
  for update to authenticated using (true) with check (true);
