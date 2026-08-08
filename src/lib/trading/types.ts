import type { AssetClass } from "@/lib/market/alpaca-bars";

export type Direction = "long" | "short";

export type StrategyId = "momentum" | "mean_reversion" | "breakout" | "composite";

// Full OHLCV bar — a superset of alpaca-bars.ts's close-only AssetHistoryResult
// shape, needed for strategy math (ATR, Donchian channels, volume
// confirmation) that a close-only series can't support.
export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Every strategy is a pure function: real bars in, a signal (or null, no
// setup) out. `rationale` records which real conditions actually fired —
// this feeds the audit trail directly, so nothing free-text/fabricated
// ever needs to be reconstructed after the fact.
export interface StrategySignal {
  direction: Direction;
  confidence: number; // 0-1, derived from the strategy's own math, never asserted
  entry: number;
  stop: number;
  target: number;
  rationale: string[];
}

export type StrategyParams = Record<string, number>;

export interface StrategyMeta {
  id: StrategyId;
  name: string;
  description: string;
  defaultParams: StrategyParams;
}

export type StrategyRunFn = (bars: OHLCVBar[], params: StrategyParams) => StrategySignal | null;

export interface StrategyDefinition extends StrategyMeta {
  run: StrategyRunFn;
}

// What the risk layer needs to know before approving a signal — real
// account state (from getAlpacaPortfolio()) plus what's already been
// approved today, so exposure caps are cumulative across the whole scan,
// not evaluated per-signal in isolation.
export interface PortfolioContext {
  equity: number;
  cash: number;
  todayApprovedExposureUsd: number;
  todayApprovedByAssetClassUsd: Record<AssetClass, number>;
  // (equity - lastEquity) / lastEquity * 100, from Alpaca's real account
  // data — null when unavailable (account not connected), in which case
  // the daily-loss circuit breaker is skipped rather than guessed at.
  todayPnLPct: number | null;
}

export interface RiskCheckResult {
  approved: boolean;
  reasons: string[];
  positionSizeUsd: number;
  positionSizeQty: number;
}

export type ExitReason = "stop" | "target" | "end_of_data";

export interface BacktestTrade {
  direction: Direction;
  entryAt: string;
  entryPrice: number;
  exitAt: string;
  exitPrice: number;
  exitReason: ExitReason;
  pnlPct: number;
  pnlUsd: number;
}

export interface WindowResult {
  windowStart: string;
  windowEnd: string;
  trades: BacktestTrade[];
  totalReturnPct: number;
}

export interface BacktestMetrics {
  sharpeRatio: number | null;
  maxDrawdownPct: number | null;
  winRatePct: number | null;
  profitFactor: number | null;
  totalReturnPct: number;
  totalTrades: number;
}

export interface BacktestResult {
  windows: WindowResult[];
  aggregate: BacktestMetrics;
  trades: BacktestTrade[];
}

export interface BacktestParams {
  strategyId: StrategyId;
  symbol: string;
  assetClass: AssetClass;
  bars: OHLCVBar[];
  strategyParams: StrategyParams;
  transactionCostBps: number;
  walkForward: { windowDays: number; stepDays: number };
}
