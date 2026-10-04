-- What a signal means, for a person (src/lib/trading/signals/explain.ts):
-- the asset's common name ("Palladium (PALL ETF proxy)"), its reasoning in
-- plain English, and sources to check it against (a price chart, and for
-- approved signals the asset's recent headlines). Written by the scan
-- beside the strategy's own rationale, which stays the audit record. Read
-- by K.I.V.'s Trading Signals card and Jarvis's Markets panel. Nullable:
-- signals from before this have none.

alter table public.trading_signals
  add column asset_name text,
  add column summary text,
  add column sources jsonb not null default '[]'::jsonb;
