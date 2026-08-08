import type { StrategyDefinition, StrategyId } from "../types";
import { runMomentum, MOMENTUM_DEFAULT_PARAMS } from "./momentum";
import { runMeanReversion, MEAN_REVERSION_DEFAULT_PARAMS } from "./mean-reversion";
import { runBreakout, BREAKOUT_DEFAULT_PARAMS } from "./breakout";
import { runComposite, COMPOSITE_DEFAULT_PARAMS } from "./composite";

export const STRATEGY_IDS: StrategyId[] = ["momentum", "mean_reversion", "breakout", "composite"];

// Single source of truth for every strategy — the scheduled scan loops
// this, the backtest engine loops this, and trading_strategies rows are
// upserted from this at run time (git-versioned in code, matching how
// roster.ts and alpaca-bars.ts's universes already work in this
// codebase, rather than requiring a manual DB seed step).
export const STRATEGY_REGISTRY: Record<StrategyId, StrategyDefinition> = {
  momentum: {
    id: "momentum",
    name: "Momentum",
    description:
      "Trend-following: long/short when price, a fast/slow moving-average cross, and recent rate-of-change all agree, with ATR-scaled stop/target.",
    defaultParams: MOMENTUM_DEFAULT_PARAMS,
    run: runMomentum,
  },
  mean_reversion: {
    id: "mean_reversion",
    name: "Mean Reversion",
    description:
      "Long-only reversion to a 20-day mean when statistically oversold, filtered to skip real downtrends (no falling-knife entries).",
    defaultParams: MEAN_REVERSION_DEFAULT_PARAMS,
    run: runMeanReversion,
  },
  breakout: {
    id: "breakout",
    name: "Breakout",
    description: "Long/short on a volume-confirmed break of the prior N-day Donchian channel.",
    defaultParams: BREAKOUT_DEFAULT_PARAMS,
    run: runBreakout,
  },
  composite: {
    id: "composite",
    name: "Composite",
    description:
      "Ensemble vote across Momentum, Mean Reversion, and Breakout — only signals when at least 2 of 3 agree on direction.",
    defaultParams: COMPOSITE_DEFAULT_PARAMS,
    run: runComposite,
  },
};
