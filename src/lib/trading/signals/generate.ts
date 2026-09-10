import { createAdminClient } from "@/lib/supabase/admin";
import { logAgentActivity } from "@/lib/agents/log";
import { getAlpacaPortfolio } from "@/lib/portfolio/alpaca";
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
import { evaluateSignal } from "../risk/limits";
import { isTradingHalted } from "../risk/kill-switch";
import type { PortfolioContext, RiskCheckResult, StrategyId, StrategySignal } from "../types";

// Enough for every strategy's longest lookback (mean-reversion needs
// trendPeriod(50) + trendSlopeLookback(10) + 2 = 62) with real headroom —
// smaller than the backtest's lookback since a live scan only needs
// today's decision, not months of walk-forward history.
const SIGNAL_LOOKBACK_DAYS = 120;

const UNIVERSE_BY_ASSET_CLASS: Record<AssetClass, TrackedAsset[]> = {
  stocks: STOCK_UNIVERSE,
  crypto: CRYPTO_UNIVERSE,
  metals: METAL_UNIVERSE,
  futures: FUTURES_UNIVERSE,
};

export interface SignalScanSummary {
  halted: boolean;
  haltReason?: string;
  signalsGenerated: number;
  signalsApproved: number;
  signalsRejected: number;
  errors: string[];
}

// The daily scheduled scan's entry point. Kill switch is checked first
// and unconditionally short-circuits everything else — no signal is ever
// generated, evaluated, or persisted while halted.
export async function generateSignalsForUniverse(): Promise<SignalScanSummary> {
  const killSwitch = await isTradingHalted();
  if (killSwitch.halted) {
    await logAgentActivity({
      agentId: "trading-engine",
      action: "Daily signal scan skipped",
      detail: killSwitch.reason,
      status: "warning",
    }).catch(() => {});
    return {
      halted: true,
      haltReason: killSwitch.reason,
      signalsGenerated: 0,
      signalsApproved: 0,
      signalsRejected: 0,
      errors: [],
    };
  }

  const portfolioResult = await getAlpacaPortfolio();
  if (!portfolioResult.connected) {
    throw new Error("Alpaca credentials not configured — cannot run the signal scan.");
  }
  if ("fetchError" in portfolioResult) {
    throw new Error(`Failed to fetch Alpaca portfolio: ${portfolioResult.fetchError}`);
  }

  const { account } = portfolioResult.portfolio;
  const todayPnLPct = account.lastEquity > 0 ? ((account.equity - account.lastEquity) / account.lastEquity) * 100 : null;

  const context: PortfolioContext = {
    equity: account.equity,
    cash: account.cash,
    todayApprovedExposureUsd: 0,
    todayApprovedByAssetClassUsd: { stocks: 0, crypto: 0, metals: 0, futures: 0 },
    todayPnLPct,
  };

  const admin = await createAdminClient();
  await syncStrategyRegistry(admin);

  const errors: string[] = [];
  let signalsGenerated = 0;
  let signalsApproved = 0;
  let signalsRejected = 0;

  for (const [assetClass, universe] of Object.entries(UNIVERSE_BY_ASSET_CLASS) as [AssetClass, TrackedAsset[]][]) {
    for (const asset of universe) {
      const history = await getFullBarHistory(asset.symbol, assetClass, SIGNAL_LOOKBACK_DAYS);
      if (!history.connected) {
        throw new Error("Alpaca credentials not configured — cannot run the signal scan.");
      }
      if ("error" in history) {
        errors.push(`${asset.symbol}: ${history.error}`);
        continue;
      }

      for (const strategyId of STRATEGY_IDS) {
        try {
          const strategy = STRATEGY_REGISTRY[strategyId];
          const signal = strategy.run(history.bars, strategy.defaultParams);
          if (!signal) continue;

          signalsGenerated++;
          const risk = evaluateSignal(signal, assetClass, context);

          if (risk.approved) {
            signalsApproved++;
            context.todayApprovedExposureUsd += risk.positionSizeUsd;
            context.todayApprovedByAssetClassUsd[assetClass] =
              (context.todayApprovedByAssetClassUsd[assetClass] ?? 0) + risk.positionSizeUsd;
          } else {
            signalsRejected++;
          }

          await persistSignalAndDecision(admin, asset.symbol, assetClass, strategyId, signal, risk);
        } catch (err) {
          errors.push(`${asset.symbol}/${strategyId}: ${err instanceof Error ? err.message : "signal generation failed"}`);
        }
      }
    }
  }

  await logAgentActivity({
    agentId: "trading-engine",
    action: "Daily signal scan complete",
    detail: `${signalsGenerated} signals generated, ${signalsApproved} approved, ${signalsRejected} rejected${errors.length > 0 ? `, ${errors.length} errors` : ""}`,
    status: errors.length > 0 ? "warning" : "success",
  }).catch(() => {});

  return { halted: false, signalsGenerated, signalsApproved, signalsRejected, errors };
}

async function persistSignalAndDecision(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  symbol: string,
  assetClass: AssetClass,
  strategyId: StrategyId,
  signal: StrategySignal,
  risk: RiskCheckResult,
): Promise<void> {
  const { data: signalRow, error: signalError } = await admin
    .from("trading_signals")
    .insert({
      strategy_id: strategyId,
      symbol,
      asset_class: assetClass,
      direction: signal.direction,
      confidence: signal.confidence,
      entry: signal.entry,
      stop: signal.stop,
      target: signal.target,
      rationale: signal.rationale,
    })
    .select()
    .single();

  if (signalError) throw new Error(`Failed to persist signal: ${signalError.message}`);

  const { error: decisionError } = await admin.from("trading_decisions").insert({
    signal_id: signalRow.id,
    approved: risk.approved,
    reasons: risk.reasons,
    position_size_usd: risk.positionSizeUsd,
    position_size_qty: risk.positionSizeQty,
  });

  if (decisionError) throw new Error(`Failed to persist decision: ${decisionError.message}`);
}
