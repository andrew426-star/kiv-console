import { createAdminClient } from "@/lib/supabase/admin";
import type { AssetClass } from "@/lib/market/alpaca-bars";
import type { Direction, StrategyId } from "@/lib/trading/types";

const VALID_ASSET_CLASSES: AssetClass[] = ["stocks", "crypto", "metals", "futures"];
const VALID_STRATEGY_IDS: StrategyId[] = ["momentum", "mean_reversion", "breakout", "composite"];

export interface TradingSignalForAgent {
  symbol: string;
  assetClass: AssetClass;
  strategyId: StrategyId;
  direction: Direction;
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  rationale: string[];
  approved: boolean;
  decisionReasons: string[];
  positionSizeUsd: number;
  createdAt: string;
}

type TradingSignalRow = {
  symbol: string;
  asset_class: AssetClass;
  strategy_id: StrategyId;
  direction: Direction;
  confidence: number;
  entry: number;
  stop: number;
  target: number;
  rationale: string[];
  created_at: string;
  trading_decisions: { approved: boolean; reasons: string[]; position_size_usd: number }[];
};

// Admin-scoped read of already risk-evaluated signals — every row already
// passed OR was explicitly rejected by evaluateSignal() before this tool
// ever runs, so Ticker/Oracle report exactly what the engine decided,
// never re-derive their own read of a raw signal.
export async function getTradingSignalsForAgent(args: {
  symbol?: string;
  assetClass?: string;
  approvedOnly?: boolean;
  limit?: number;
}): Promise<TradingSignalForAgent[]> {
  const admin = createAdminClient();
  const limit = args.limit && args.limit > 0 ? Math.round(args.limit) : 20;

  let query = admin
    .from("trading_signals")
    .select(
      "symbol, asset_class, strategy_id, direction, confidence, entry, stop, target, rationale, created_at, trading_decisions(approved, reasons, position_size_usd)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.symbol) query = query.eq("symbol", args.symbol.trim().toUpperCase());
  if (args.assetClass && VALID_ASSET_CLASSES.includes(args.assetClass as AssetClass)) {
    query = query.eq("asset_class", args.assetClass);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) return [];

  const rows = data as unknown as TradingSignalRow[];
  const filtered = args.approvedOnly ? rows.filter((row) => row.trading_decisions[0]?.approved) : rows;

  return filtered.map((row) => {
    const decision = row.trading_decisions[0];
    return {
      symbol: row.symbol,
      assetClass: row.asset_class,
      strategyId: row.strategy_id,
      direction: row.direction,
      confidence: row.confidence,
      entry: row.entry,
      stop: row.stop,
      target: row.target,
      rationale: row.rationale ?? [],
      approved: decision?.approved ?? false,
      decisionReasons: decision?.reasons ?? [],
      positionSizeUsd: decision?.position_size_usd ?? 0,
      createdAt: row.created_at,
    };
  });
}

export interface StrategyPerformanceForAgent {
  strategyId: StrategyId;
  symbol: string;
  assetClass: AssetClass;
  windowDays: number;
  totalTrades: number;
  winRatePct: number | null;
  profitFactor: number | null;
  sharpeRatio: number | null;
  maxDrawdownPct: number | null;
  totalReturnPct: number;
  asOf: string;
}

type BacktestRunRow = {
  strategy_id: StrategyId;
  symbol: string;
  asset_class: AssetClass;
  window_days: number;
  total_trades: number;
  win_rate_pct: number | null;
  profit_factor: number | null;
  sharpe_ratio: number | null;
  max_drawdown_pct: number | null;
  total_return_pct: number;
  created_at: string;
};

// Real, walk-forward-backtested performance — not a live-trading track
// record, since Tier 1 never executes anything. Most-recent-first; not
// deduplicated to one row per (strategy, symbol) since the caller can
// already narrow to a specific pair via args.
export async function getStrategyPerformanceForAgent(args: {
  strategyId?: string;
  symbol?: string;
  limit?: number;
}): Promise<StrategyPerformanceForAgent[]> {
  const admin = createAdminClient();
  const limit = args.limit && args.limit > 0 ? Math.round(args.limit) : 20;

  let query = admin
    .from("trading_backtest_runs")
    .select(
      "strategy_id, symbol, asset_class, window_days, total_trades, win_rate_pct, profit_factor, sharpe_ratio, max_drawdown_pct, total_return_pct, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (args.strategyId && VALID_STRATEGY_IDS.includes(args.strategyId as StrategyId)) {
    query = query.eq("strategy_id", args.strategyId);
  }
  if (args.symbol) query = query.eq("symbol", args.symbol.trim().toUpperCase());

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) return [];

  const rows = data as unknown as BacktestRunRow[];
  return rows.map((row) => ({
    strategyId: row.strategy_id,
    symbol: row.symbol,
    assetClass: row.asset_class,
    windowDays: row.window_days,
    totalTrades: row.total_trades,
    winRatePct: row.win_rate_pct,
    profitFactor: row.profit_factor,
    sharpeRatio: row.sharpe_ratio,
    maxDrawdownPct: row.max_drawdown_pct,
    totalReturnPct: row.total_return_pct,
    asOf: row.created_at,
  }));
}
