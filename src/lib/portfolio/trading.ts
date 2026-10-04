import { createClient } from "@/lib/supabase/server";
import {
  CRYPTO_UNIVERSE,
  FUTURES_UNIVERSE,
  METAL_UNIVERSE,
  STOCK_UNIVERSE,
  type AssetClass,
} from "@/lib/market/alpaca-bars";
import { chartSource, explainSignal, type SignalSource } from "@/lib/trading/signals/explain";
import type { Direction, StrategyId } from "@/lib/trading/types";

export interface KillSwitchStatus {
  enabled: boolean;
  reason: string | null;
  updatedAt: string;
}

export async function getKillSwitchStatus(): Promise<KillSwitchStatus> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_kill_switch")
    .select("enabled, reason, updated_at")
    .eq("id", "default")
    .single();
  if (error) throw error;
  return { enabled: data.enabled, reason: data.reason, updatedAt: data.updated_at };
}

export interface TradingSignalRow {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  strategyId: StrategyId;
  direction: Direction;
  confidence: number;
  approved: boolean;
  reasons: string[];
  positionSizeUsd: number;
  createdAt: string;
  // Common name, plain-English reasoning and sources (explain.ts). Stored by
  // the scan; filled in here for signals from before it stored them.
  assetName: string;
  summary: string;
  sources: SignalSource[];
}

const ASSET_NAMES = new Map(
  [...STOCK_UNIVERSE, ...CRYPTO_UNIVERSE, ...METAL_UNIVERSE, ...FUTURES_UNIVERSE].map((a) => [a.symbol, a.label]),
);

type RawSignalRow = {
  id: string;
  symbol: string;
  asset_class: AssetClass;
  strategy_id: StrategyId;
  direction: Direction;
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  rationale: string[] | null;
  asset_name: string | null;
  summary: string | null;
  sources: SignalSource[] | null;
  created_at: string;
  trading_decisions: { approved: boolean; reasons: string[]; position_size_usd: number }[];
};

// Real signals + their real risk-engine decisions — the same data Ticker
// and Oracle read via getTradingSignalsForAgent, through the RLS-enforced
// session client instead of the admin client since this runs behind a
// real signed-in K.I.V. session.
export async function getRecentTradingSignals(limit = 15): Promise<TradingSignalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_signals")
    .select(
      "id, symbol, asset_class, strategy_id, direction, confidence, entry, stop, target, rationale, asset_name, summary, sources, created_at, trading_decisions(approved, reasons, position_size_usd)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!data) return [];

  const rows = data as unknown as RawSignalRow[];
  return rows.map((row) => {
    const decision = row.trading_decisions[0];
    const assetName = row.asset_name ?? ASSET_NAMES.get(row.symbol) ?? row.symbol;
    return {
      id: row.id,
      symbol: row.symbol,
      assetClass: row.asset_class,
      strategyId: row.strategy_id,
      direction: row.direction,
      confidence: row.confidence,
      approved: decision?.approved ?? false,
      reasons: decision?.reasons ?? [],
      positionSizeUsd: decision?.position_size_usd ?? 0,
      createdAt: row.created_at,
      assetName,
      summary:
        row.summary ??
        explainSignal(
          {
            direction: row.direction,
            entry: Number(row.entry),
            stop: Number(row.stop),
            target: Number(row.target),
            rationale: row.rationale ?? [],
          },
          row.strategy_id,
          assetName,
        ),
      sources: row.sources?.length ? row.sources : [chartSource(row.symbol, row.asset_class)],
    };
  });
}

export interface StrategyPerformanceSummary {
  strategyId: StrategyId;
  symbolsCovered: number;
  totalTrades: number;
  avgWinRatePct: number | null;
  avgSharpeRatio: number | null;
  avgTotalReturnPct: number;
  asOf: string;
}

type RawBacktestRunRow = {
  strategy_id: StrategyId;
  symbol: string;
  total_trades: number;
  win_rate_pct: number | null;
  sharpe_ratio: number | null;
  total_return_pct: number;
  created_at: string;
};

// Aggregates the most recent backtest batch (a weekly run covers the full
// ~44-symbol universe x 4 strategies, ~176 rows — 200 comfortably covers
// one full batch) into one summary row per strategy, since a raw row list
// would just show 200 near-identical timestamps with no real per-strategy
// read on performance.
export async function getStrategyPerformanceSummary(): Promise<StrategyPerformanceSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_backtest_runs")
    .select("strategy_id, symbol, total_trades, win_rate_pct, sharpe_ratio, total_return_pct, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  if (!data || data.length === 0) return [];

  const rows = data as unknown as RawBacktestRunRow[];
  const byStrategy = new Map<StrategyId, RawBacktestRunRow[]>();
  for (const row of rows) {
    const list = byStrategy.get(row.strategy_id) ?? [];
    list.push(row);
    byStrategy.set(row.strategy_id, list);
  }

  return Array.from(byStrategy.entries()).map(([strategyId, strategyRows]) => {
    const winRates = strategyRows.map((r) => r.win_rate_pct).filter((v): v is number => v !== null);
    const sharpes = strategyRows.map((r) => r.sharpe_ratio).filter((v): v is number => v !== null);
    return {
      strategyId,
      symbolsCovered: new Set(strategyRows.map((r) => r.symbol)).size,
      totalTrades: strategyRows.reduce((sum, r) => sum + r.total_trades, 0),
      avgWinRatePct: winRates.length > 0 ? winRates.reduce((a, b) => a + b, 0) / winRates.length : null,
      avgSharpeRatio: sharpes.length > 0 ? sharpes.reduce((a, b) => a + b, 0) / sharpes.length : null,
      avgTotalReturnPct: strategyRows.reduce((sum, r) => sum + r.total_return_pct, 0) / strategyRows.length,
      asOf: strategyRows[0].created_at,
    };
  });
}
