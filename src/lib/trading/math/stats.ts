import type { OHLCVBar, BacktestTrade } from "../types";

// Pure, hand-rolled statistics — no numerical library needed (moving
// averages, z-scores, and Donchian channels are simple array reductions;
// there's no matrix algebra or fitting anywhere in this codebase's
// strategies). Every function below returns a full series aligned to the
// input array's indices (`null` where there isn't enough history yet),
// so callers can index into "the value as of bar i" without ever looking
// past it — the property the backtest engine's no-lookahead guarantee
// depends on.

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function stdev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Simple moving average, full series. sma(values, 20)[i] uses
// values[i-19..i] — null until index >= period - 1.
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let windowSum = 0;
  for (let i = 0; i < values.length; i++) {
    windowSum += values[i];
    if (i >= period) windowSum -= values[i - period];
    if (i >= period - 1) out[i] = windowSum / period;
  }
  return out;
}

// Exponential moving average, full series, seeded with the SMA of the
// first `period` values (standard convention) — null before that point.
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  const k = 2 / (period + 1);
  let prev: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    if (prev === null) {
      prev = mean(values.slice(i - period + 1, i + 1));
    } else {
      prev = values[i] * k + prev * (1 - k);
    }
    out[i] = prev;
  }
  return out;
}

// Rate of change over `period` bars, as a percentage: (close[i] - close[i-period]) / close[i-period] * 100.
export function rateOfChange(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period; i < values.length; i++) {
    const prior = values[i - period];
    if (prior !== 0) out[i] = ((values[i] - prior) / prior) * 100;
  }
  return out;
}

// Average True Range, Wilder's smoothing, full series.
export function atr(bars: OHLCVBar[], period: number): (number | null)[] {
  const trueRanges: number[] = bars.map((bar, i) => {
    if (i === 0) return bar.high - bar.low;
    const prevClose = bars[i - 1].close;
    return Math.max(bar.high - bar.low, Math.abs(bar.high - prevClose), Math.abs(bar.low - prevClose));
  });
  const out: (number | null)[] = new Array(bars.length).fill(null);
  let prev: number | null = null;
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) continue;
    if (prev === null) {
      prev = mean(trueRanges.slice(i - period + 1, i + 1));
    } else {
      prev = (prev * (period - 1) + trueRanges[i]) / period;
    }
    out[i] = prev;
  }
  return out;
}

// (value - trailing mean) / trailing stdev, full series — null until
// there's a full window AND the window has nonzero variance.
export function zScore(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  for (let i = period - 1; i < values.length; i++) {
    const window = values.slice(i - period + 1, i + 1);
    const sd = stdev(window);
    if (sd > 0) out[i] = (values[i] - mean(window)) / sd;
  }
  return out;
}

// Donchian channel — the highest high / lowest low over the PRIOR
// `period` bars, deliberately excluding the current bar. Including the
// current bar's own high/low would make a same-bar "breakout" mean the
// bar broke its own extreme, which is never meaningfully true — the
// channel has to be a real prior boundary for a breakout to mean
// anything.
export function donchianChannel(
  bars: OHLCVBar[],
  period: number,
): { upper: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = new Array(bars.length).fill(null);
  const lower: (number | null)[] = new Array(bars.length).fill(null);
  for (let i = period; i < bars.length; i++) {
    const window = bars.slice(i - period, i);
    upper[i] = Math.max(...window.map((b) => b.high));
    lower[i] = Math.min(...window.map((b) => b.low));
  }
  return { upper, lower };
}

// --- Backtest performance metrics, computed over a completed trade sequence ---

// A per-trade-return Sharpe-like ratio (mean / stdev of each trade's
// pnlPct), NOT an annualized daily-return Sharpe — this repo's backtest
// doesn't mark positions to market between trades, so there's no daily
// equity curve to annualize from. Named plainly so it's never mistaken
// for the textbook annualized figure.
export function sharpeRatio(trades: BacktestTrade[]): number | null {
  if (trades.length < 2) return null;
  const returns = trades.map((t) => t.pnlPct);
  const sd = stdev(returns);
  if (sd === 0) return null;
  return mean(returns) / sd;
}

// Max drawdown over a compounded equity curve built by applying each
// trade's pnlPct sequentially to a starting base of 100 — valid because
// each symbol+strategy backtest is single-position-at-a-time by
// construction of the walk-forward loop (see backtest/engine.ts).
export function maxDrawdownPct(trades: BacktestTrade[]): number | null {
  if (trades.length === 0) return null;
  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;
  for (const trade of trades) {
    equity *= 1 + trade.pnlPct / 100;
    if (equity > peak) peak = equity;
    const drawdown = ((peak - equity) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return maxDrawdown;
}

export function winRatePct(trades: BacktestTrade[]): number | null {
  if (trades.length === 0) return null;
  const wins = trades.filter((t) => t.pnlUsd > 0).length;
  return (wins / trades.length) * 100;
}

// Sum of winning trade P&L / absolute sum of losing trade P&L. null when
// there are no losing trades (undefined/infinite, not a real number to
// report) or no trades at all.
export function profitFactor(trades: BacktestTrade[]): number | null {
  if (trades.length === 0) return null;
  const grossProfit = trades.filter((t) => t.pnlUsd > 0).reduce((sum, t) => sum + t.pnlUsd, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnlUsd < 0).reduce((sum, t) => sum + t.pnlUsd, 0));
  if (grossLoss === 0) return null;
  return grossProfit / grossLoss;
}

export function totalReturnPct(trades: BacktestTrade[]): number {
  let equity = 100;
  for (const trade of trades) equity *= 1 + trade.pnlPct / 100;
  return equity - 100;
}

// Shared by every strategy: average a handful of independent 0-1
// sub-scores (how far past a threshold a condition is, not just whether
// it's true) into one confidence figure, clamped to [0,1]. Keeps
// confidence derivation consistent and auditable across strategies
// instead of each one inventing its own scale.
export function clampConfidence(parts: number[]): number {
  if (parts.length === 0) return 0;
  const avg = parts.reduce((sum, p) => sum + p, 0) / parts.length;
  return Math.max(0, Math.min(1, avg));
}
