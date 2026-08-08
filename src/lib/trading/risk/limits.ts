import type { AssetClass } from "@/lib/market/alpaca-bars";
import type { PortfolioContext, RiskCheckResult, StrategySignal } from "../types";

// Fixed-fractional sizing: risk a fixed % of equity on the DISTANCE TO
// STOP, never a fixed % of equity as the position's own notional size.
// Deliberately not naive/full Kelly — a known-unstable sizing method (a
// winning streak's Kelly fraction can size a position large enough that
// the next real drawdown is catastrophic); fixed-fractional degrades
// gracefully instead, which is the entire point of this build.
export const RISK_PER_TRADE_PCT = 0.01; // 1% of equity risked (to stop) per position
export const MAX_POSITION_PCT_OF_EQUITY = 0.1; // no single position > 10% of equity, regardless of stop distance
export const MAX_GROSS_EXPOSURE_PCT_OF_EQUITY = 0.6; // total notional across all positions approved today
export const MAX_ASSET_CLASS_EXPOSURE_PCT_OF_EQUITY = 0.25; // per-asset-class-bucket diversification proxy, not a real correlation matrix
export const MAX_DAILY_LOSS_PCT_OF_EQUITY = 0.03; // circuit breaker: halts new approvals once today's real account P&L crosses this

function rejected(reason: string): RiskCheckResult {
  return { approved: false, reasons: [reason], positionSizeUsd: 0, positionSizeQty: 0 };
}

// Every signal's full approve/reject reasoning is returned, not just the
// approved ones — this is what gets persisted to trading_decisions so a
// rejected signal is a visible, auditable fact, never silently dropped.
export function evaluateSignal(
  signal: StrategySignal,
  assetClass: AssetClass,
  context: PortfolioContext,
): RiskCheckResult {
  // Alpaca does not support short-selling crypto — reject before any
  // sizing math runs, rather than silently emit an unexecutable signal.
  if (signal.direction === "short" && assetClass === "crypto") {
    return rejected("Short-selling is not supported for crypto on Alpaca — this signal cannot be executed as-is.");
  }

  if (context.todayPnLPct !== null && context.todayPnLPct <= -MAX_DAILY_LOSS_PCT_OF_EQUITY * 100) {
    return rejected(
      `Daily loss circuit breaker triggered: today's real account P&L is ${context.todayPnLPct.toFixed(2)}%, at or beyond the -${(MAX_DAILY_LOSS_PCT_OF_EQUITY * 100).toFixed(1)}% limit. No new positions approved for the rest of today.`,
    );
  }

  const stopDistance = Math.abs(signal.entry - signal.stop);
  if (stopDistance <= 0 || !Number.isFinite(stopDistance)) {
    return rejected("Invalid stop distance — cannot size a position without real risk-per-share.");
  }
  if (context.equity <= 0) {
    return rejected("Account equity is zero or unavailable — cannot size a position.");
  }

  const riskBudgetUsd = context.equity * RISK_PER_TRADE_PCT;
  const qtyFromRisk = riskBudgetUsd / stopDistance;
  let positionSizeUsd = qtyFromRisk * signal.entry;

  const reasons: string[] = [];

  const maxPositionUsd = context.equity * MAX_POSITION_PCT_OF_EQUITY;
  if (positionSizeUsd > maxPositionUsd) {
    positionSizeUsd = maxPositionUsd;
    reasons.push(
      `Position size capped at ${(MAX_POSITION_PCT_OF_EQUITY * 100).toFixed(0)}% of equity ($${maxPositionUsd.toFixed(0)}) — fixed-fractional risk sizing alone would have sized it larger.`,
    );
  }

  const maxGrossExposureUsd = context.equity * MAX_GROSS_EXPOSURE_PCT_OF_EQUITY;
  const projectedGrossExposure = context.todayApprovedExposureUsd + positionSizeUsd;
  if (projectedGrossExposure > maxGrossExposureUsd) {
    return rejected(
      `Approving this position would bring today's gross approved exposure to $${projectedGrossExposure.toFixed(0)}, over the ${(MAX_GROSS_EXPOSURE_PCT_OF_EQUITY * 100).toFixed(0)}% of equity limit ($${maxGrossExposureUsd.toFixed(0)}).`,
    );
  }

  const maxClassExposureUsd = context.equity * MAX_ASSET_CLASS_EXPOSURE_PCT_OF_EQUITY;
  const currentClassExposure = context.todayApprovedByAssetClassUsd[assetClass] ?? 0;
  const projectedClassExposure = currentClassExposure + positionSizeUsd;
  if (projectedClassExposure > maxClassExposureUsd) {
    return rejected(
      `Approving this position would bring today's ${assetClass} exposure to $${projectedClassExposure.toFixed(0)}, over the ${(MAX_ASSET_CLASS_EXPOSURE_PCT_OF_EQUITY * 100).toFixed(0)}% of equity diversification cap ($${maxClassExposureUsd.toFixed(0)}) for that asset class.`,
    );
  }

  if (positionSizeUsd > context.cash) {
    return rejected(`Position size ($${positionSizeUsd.toFixed(0)}) exceeds available cash ($${context.cash.toFixed(0)}).`);
  }

  const positionSizeQty = positionSizeUsd / signal.entry;
  reasons.push(
    `Approved: sized to risk ${(RISK_PER_TRADE_PCT * 100).toFixed(1)}% of equity ($${riskBudgetUsd.toFixed(0)}) against a $${stopDistance.toFixed(2)} stop distance.`,
  );

  return { approved: true, reasons, positionSizeUsd, positionSizeQty };
}
