import type { OHLCVBar, StrategyParams, StrategySignal, Direction } from "../types";
import { runMomentum, MOMENTUM_DEFAULT_PARAMS } from "./momentum";
import { runMeanReversion, MEAN_REVERSION_DEFAULT_PARAMS } from "./mean-reversion";
import { runBreakout, BREAKOUT_DEFAULT_PARAMS } from "./breakout";

export const COMPOSITE_DEFAULT_PARAMS: StrategyParams = {
  minAgreement: 2,
};

interface NamedResult {
  name: string;
  signal: StrategySignal;
}

// Ensemble vote across the other three strategies — only fires when at
// least `minAgreement` of them agree on direction. This is the
// "stability through diversification" strategy: a transparent vote
// across independently-reasoned signals, not a fitted model with
// parameters to overfit. Entry/stop/target are averaged across the
// agreeing strategies' own real numbers, not re-derived from scratch.
export function runComposite(
  bars: OHLCVBar[],
  params: StrategyParams = COMPOSITE_DEFAULT_PARAMS,
): StrategySignal | null {
  const minAgreement = params.minAgreement ?? COMPOSITE_DEFAULT_PARAMS.minAgreement;

  const results: NamedResult[] = [
    { name: "momentum", signal: runMomentum(bars, MOMENTUM_DEFAULT_PARAMS) },
    { name: "mean_reversion", signal: runMeanReversion(bars, MEAN_REVERSION_DEFAULT_PARAMS) },
    { name: "breakout", signal: runBreakout(bars, BREAKOUT_DEFAULT_PARAMS) },
  ].flatMap((r) => (r.signal ? [{ name: r.name, signal: r.signal }] : []));

  if (results.length === 0) return null;

  const byDirection = new Map<Direction, NamedResult[]>();
  for (const r of results) {
    const list = byDirection.get(r.signal.direction) ?? [];
    list.push(r);
    byDirection.set(r.signal.direction, list);
  }

  let bestDirection: Direction | null = null;
  let bestGroup: NamedResult[] = [];
  for (const [direction, group] of byDirection) {
    if (group.length > bestGroup.length) {
      bestDirection = direction;
      bestGroup = group;
    }
  }

  if (!bestDirection || bestGroup.length < minAgreement) return null;

  const avg = (fn: (s: StrategySignal) => number) =>
    bestGroup.reduce((sum, r) => sum + fn(r.signal), 0) / bestGroup.length;

  return {
    direction: bestDirection,
    confidence: Math.max(0, Math.min(1, avg((s) => s.confidence))),
    entry: avg((s) => s.entry),
    stop: avg((s) => s.stop),
    target: avg((s) => s.target),
    rationale: [
      `${bestGroup.length} of 3 strategies agree on ${bestDirection}: ${bestGroup.map((r) => r.name).join(", ")}`,
      ...bestGroup.flatMap((r) => r.signal.rationale.map((line) => `[${r.name}] ${line}`)),
    ],
  };
}
