import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentActivity } from "@/lib/agents/log";
import {
  STOCK_UNIVERSE,
  CRYPTO_UNIVERSE,
  METAL_UNIVERSE,
  FUTURES_UNIVERSE,
  getFullBarHistory,
  type AssetClass,
  type TrackedAsset,
} from "@/lib/market/alpaca-bars";
import { STRATEGY_IDS, STRATEGY_REGISTRY } from "../strategies";
import { syncStrategyRegistry } from "../strategies/sync";
import { runBacktest } from "./engine";
import type { StrategyId, BacktestResult } from "../types";

// ~13 months — matches this account's confirmed real historical depth
// (275 daily AAPL bars with no cap hit), enough for several non-
// overlapping walk-forward windows.
const BACKTEST_LOOKBACK_DAYS = 400;
const WALK_FORWARD_WINDOW_DAYS = 63; // ~1 trading quarter
const WALK_FORWARD_STEP_DAYS = 63; // non-overlapping, per the approved plan's design
const TRANSACTION_COST_BPS = 5; // conservative round-trip slippage/commission assumption

const UNIVERSE_BY_ASSET_CLASS: Record<AssetClass, TrackedAsset[]> = {
  stocks: STOCK_UNIVERSE,
  crypto: CRYPTO_UNIVERSE,
  metals: METAL_UNIVERSE,
  futures: FUTURES_UNIVERSE,
};

export interface BacktestRunSummary {
  symbol: string;
  assetClass: AssetClass;
  strategyId: StrategyId;
  totalTrades: number;
  sharpeRatio: number | null;
  totalReturnPct: number;
  error?: string;
}

// The weekly scheduled job's entry point: runs every registered strategy
// against every symbol in alpaca-bars.ts's curated universe (bar history
// fetched once per symbol, reused across all 4 strategies), persisting
// each run + its individual trades to Supabase so Ticker/Oracle can cite
// real backtested performance instead of an unverified impression.
export async function runAllBacktests(): Promise<BacktestRunSummary[]> {
  const admin = await createAdminClient();
  await syncStrategyRegistry(admin);

  const summaries: BacktestRunSummary[] = [];

  for (const [assetClass, universe] of Object.entries(UNIVERSE_BY_ASSET_CLASS) as [AssetClass, TrackedAsset[]][]) {
    for (const asset of universe) {
      const history = await getFullBarHistory(asset.symbol, assetClass, BACKTEST_LOOKBACK_DAYS);
      if (!history.connected) {
        throw new Error("Alpaca credentials not configured — cannot run backtests.");
      }
      if ("error" in history) {
        for (const strategyId of STRATEGY_IDS) {
          summaries.push({
            symbol: asset.symbol,
            assetClass,
            strategyId,
            totalTrades: 0,
            sharpeRatio: null,
            totalReturnPct: 0,
            error: history.error,
          });
        }
        continue;
      }

      for (const strategyId of STRATEGY_IDS) {
        const strategy = STRATEGY_REGISTRY[strategyId];
        try {
          const result = runBacktest({
            strategyId,
            symbol: asset.symbol,
            assetClass,
            bars: history.bars,
            strategyParams: strategy.defaultParams,
            transactionCostBps: TRANSACTION_COST_BPS,
            walkForward: { windowDays: WALK_FORWARD_WINDOW_DAYS, stepDays: WALK_FORWARD_STEP_DAYS },
          });
          await persistBacktestRun(admin, asset.symbol, assetClass, strategyId, result);
          summaries.push({
            symbol: asset.symbol,
            assetClass,
            strategyId,
            totalTrades: result.aggregate.totalTrades,
            sharpeRatio: result.aggregate.sharpeRatio,
            totalReturnPct: result.aggregate.totalReturnPct,
          });
        } catch (err) {
          summaries.push({
            symbol: asset.symbol,
            assetClass,
            strategyId,
            totalTrades: 0,
            sharpeRatio: null,
            totalReturnPct: 0,
            error: err instanceof Error ? err.message : "Backtest failed",
          });
        }
      }
    }
  }

  const failed = summaries.filter((s) => s.error).length;
  await logAgentActivity({
    agentId: "trading-engine",
    action: "Weekly backtest run complete",
    detail: `${summaries.length - failed}/${summaries.length} strategy/symbol backtests completed successfully`,
    status: failed > 0 ? "warning" : "success",
  }).catch(() => {});

  return summaries;
}

async function persistBacktestRun(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  symbol: string,
  assetClass: AssetClass,
  strategyId: StrategyId,
  result: BacktestResult,
): Promise<void> {
  const { data: run, error: runError } = await admin
    .from("trading_backtest_runs")
    .insert({
      strategy_id: strategyId,
      symbol,
      asset_class: assetClass,
      window_days: WALK_FORWARD_WINDOW_DAYS,
      step_days: WALK_FORWARD_STEP_DAYS,
      transaction_cost_bps: TRANSACTION_COST_BPS,
      total_trades: result.aggregate.totalTrades,
      win_rate_pct: result.aggregate.winRatePct,
      profit_factor: result.aggregate.profitFactor,
      sharpe_ratio: result.aggregate.sharpeRatio,
      max_drawdown_pct: result.aggregate.maxDrawdownPct,
      total_return_pct: result.aggregate.totalReturnPct,
    })
    .select()
    .single();

  if (runError) throw new Error(`Failed to persist backtest run: ${runError.message}`);
  if (result.trades.length === 0) return;

  const { error: tradesError } = await admin.from("trading_backtest_trades").insert(
    result.trades.map((trade) => ({
      backtest_run_id: run.id,
      direction: trade.direction,
      entry_at: trade.entryAt,
      entry_price: trade.entryPrice,
      exit_at: trade.exitAt,
      exit_price: trade.exitPrice,
      exit_reason: trade.exitReason,
      pnl_pct: trade.pnlPct,
      pnl_usd: trade.pnlUsd,
    })),
  );

  if (tradesError) throw new Error(`Failed to persist backtest trades: ${tradesError.message}`);
}
