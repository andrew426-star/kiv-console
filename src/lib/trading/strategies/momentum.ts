import type { OHLCVBar, StrategyParams, StrategySignal } from "../types";
import { sma, atr, rateOfChange, clampConfidence } from "../math/stats";

export const MOMENTUM_DEFAULT_PARAMS: StrategyParams = {
  fastPeriod: 20,
  slowPeriod: 50,
  rocPeriod: 10,
  atrPeriod: 14,
  atrStopMultiple: 2,
  atrTargetMultiple: 3,
};

// Trend-following: long when price is above its slow moving average AND
// the fast average is above the slow one (a real "golden cross" state,
// not a momentary blip) AND recent rate-of-change is positive — three
// independent confirmations, not one noisy signal. Short is the exact
// mirror. Stop/target are sized off ATR so they scale with the symbol's
// own real volatility instead of a fixed percentage that's too tight for
// a volatile name and too loose for a calm one.
export function runMomentum(
  bars: OHLCVBar[],
  params: StrategyParams = MOMENTUM_DEFAULT_PARAMS,
): StrategySignal | null {
  const fastPeriod = params.fastPeriod ?? MOMENTUM_DEFAULT_PARAMS.fastPeriod;
  const slowPeriod = params.slowPeriod ?? MOMENTUM_DEFAULT_PARAMS.slowPeriod;
  const rocPeriod = params.rocPeriod ?? MOMENTUM_DEFAULT_PARAMS.rocPeriod;
  const atrPeriod = params.atrPeriod ?? MOMENTUM_DEFAULT_PARAMS.atrPeriod;
  const atrStopMultiple = params.atrStopMultiple ?? MOMENTUM_DEFAULT_PARAMS.atrStopMultiple;
  const atrTargetMultiple = params.atrTargetMultiple ?? MOMENTUM_DEFAULT_PARAMS.atrTargetMultiple;

  if (bars.length < slowPeriod + 2) return null;

  const closes = bars.map((b) => b.close);
  const fastSma = sma(closes, fastPeriod);
  const slowSma = sma(closes, slowPeriod);
  const roc = rateOfChange(closes, rocPeriod);
  const atrSeries = atr(bars, atrPeriod);

  const i = bars.length - 1;
  const prevI = i - 1;
  const fast = fastSma[i];
  const slow = slowSma[i];
  const prevFast = fastSma[prevI];
  const prevSlow = slowSma[prevI];
  const rocNow = roc[i];
  const atrNow = atrSeries[i];
  const close = closes[i];

  if (
    fast === null ||
    slow === null ||
    prevFast === null ||
    prevSlow === null ||
    rocNow === null ||
    atrNow === null ||
    atrNow <= 0
  ) {
    return null;
  }

  const crossedUp = prevFast <= prevSlow && fast > slow;
  const crossedDown = prevFast >= prevSlow && fast < slow;
  const longSetup = close > slow && fast > slow && rocNow > 0;
  const shortSetup = close < slow && fast < slow && rocNow < 0;

  if (longSetup) {
    return {
      direction: "long",
      confidence: clampConfidence([
        Math.min(1, ((fast - slow) / slow) * 20),
        Math.min(1, rocNow / 10),
        crossedUp ? 0.8 : 0.5,
      ]),
      entry: close,
      stop: close - atrStopMultiple * atrNow,
      target: close + atrTargetMultiple * atrNow,
      rationale: [
        `close (${close.toFixed(2)}) above SMA(${slowPeriod}) (${slow.toFixed(2)})`,
        `SMA(${fastPeriod}) above SMA(${slowPeriod})${crossedUp ? " — fresh cross" : ""}`,
        `${rocPeriod}-bar rate of change positive (${rocNow.toFixed(2)}%)`,
      ],
    };
  }

  if (shortSetup) {
    return {
      direction: "short",
      confidence: clampConfidence([
        Math.min(1, ((slow - fast) / slow) * 20),
        Math.min(1, Math.abs(rocNow) / 10),
        crossedDown ? 0.8 : 0.5,
      ]),
      entry: close,
      stop: close + atrStopMultiple * atrNow,
      target: close - atrTargetMultiple * atrNow,
      rationale: [
        `close (${close.toFixed(2)}) below SMA(${slowPeriod}) (${slow.toFixed(2)})`,
        `SMA(${fastPeriod}) below SMA(${slowPeriod})${crossedDown ? " — fresh cross" : ""}`,
        `${rocPeriod}-bar rate of change negative (${rocNow.toFixed(2)}%)`,
      ],
    };
  }

  return null;
}
