import type { OHLCVBar, StrategyParams, StrategySignal } from "../types";
import { sma, zScore, atr, clampConfidence } from "../math/stats";

export const MEAN_REVERSION_DEFAULT_PARAMS: StrategyParams = {
  zScorePeriod: 20,
  zScoreThreshold: 2,
  trendPeriod: 50,
  trendSlopeLookback: 10,
  swingLookback: 10,
  atrPeriod: 14,
};

// Reversion to a short-term mean, but ONLY when the longer-term trend
// isn't clearly falling — the explicit "don't catch a falling knife"
// guard: a statistically cheap price in a real downtrend isn't
// necessarily cheap, it can just keep falling. Long only in v1 —
// shorting a statistical bounce is a materially different, riskier bet
// than buying an oversold dip, and Alpaca doesn't allow short crypto at
// all (see risk/limits.ts's crypto-short rejection) — so a mirrored short
// case isn't added just for symmetry.
export function runMeanReversion(
  bars: OHLCVBar[],
  params: StrategyParams = MEAN_REVERSION_DEFAULT_PARAMS,
): StrategySignal | null {
  const zPeriod = params.zScorePeriod ?? MEAN_REVERSION_DEFAULT_PARAMS.zScorePeriod;
  const zThreshold = params.zScoreThreshold ?? MEAN_REVERSION_DEFAULT_PARAMS.zScoreThreshold;
  const trendPeriod = params.trendPeriod ?? MEAN_REVERSION_DEFAULT_PARAMS.trendPeriod;
  const trendSlopeLookback = params.trendSlopeLookback ?? MEAN_REVERSION_DEFAULT_PARAMS.trendSlopeLookback;
  const swingLookback = params.swingLookback ?? MEAN_REVERSION_DEFAULT_PARAMS.swingLookback;
  const atrPeriod = params.atrPeriod ?? MEAN_REVERSION_DEFAULT_PARAMS.atrPeriod;

  if (bars.length < trendPeriod + trendSlopeLookback + 2) return null;

  const closes = bars.map((b) => b.close);
  const z = zScore(closes, zPeriod);
  const trendSma = sma(closes, trendPeriod);
  const meanSma = sma(closes, zPeriod);
  const atrSeries = atr(bars, atrPeriod);

  const i = bars.length - 1;
  const zNow = z[i];
  const trendNow = trendSma[i];
  const trendPast = trendSma[i - trendSlopeLookback];
  const meanNow = meanSma[i];
  const atrNow = atrSeries[i];
  const close = closes[i];

  if (zNow === null || trendNow === null || trendPast === null || meanNow === null || atrNow === null) {
    return null;
  }

  const trendNotFalling = trendNow >= trendPast;
  const oversold = zNow < -zThreshold;
  if (!oversold || !trendNotFalling) return null;

  // Real prior swing low (excludes the current bar, same convention as
  // donchianChannel) — floored by an ATR-based minimum distance so a
  // sharp single-bar selloff can't put the stop degenerately close to
  // entry.
  const priorBars = bars.slice(Math.max(0, i - swingLookback), i);
  const swingLow = priorBars.length > 0 ? Math.min(...priorBars.map((b) => b.low)) : close - atrNow;
  const stop = Math.min(swingLow, close - 0.5 * atrNow);
  if (stop >= close) return null;

  return {
    direction: "long",
    confidence: clampConfidence([Math.min(1, Math.abs(zNow) / (zThreshold * 2)), trendNow >= trendPast ? 0.6 : 0.2]),
    entry: close,
    stop,
    target: meanNow,
    rationale: [
      `z-score of close vs ${zPeriod}-day mean is ${zNow.toFixed(2)} (below -${zThreshold})`,
      `${trendPeriod}-day trend is flat-to-up over the last ${trendSlopeLookback} bars (not a falling-knife setup)`,
      `stop set at the lower of the ${swingLookback}-day swing low and a 0.5x ATR buffer`,
    ],
  };
}
