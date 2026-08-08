import { describe, expect, it } from "vitest";
import { runBacktest } from "../engine";
import { BREAKOUT_DEFAULT_PARAMS } from "../../strategies/breakout";
import { MOMENTUM_DEFAULT_PARAMS } from "../../strategies/momentum";
import type { OHLCVBar } from "../../types";

function dateAt(i: number): string {
  return new Date(Date.UTC(2026, 0, 1) + i * 86400000).toISOString();
}

function bar(i: number, open: number, high: number, low: number, close: number, volume: number): OHLCVBar {
  return { date: dateAt(i), open, high, low, close, volume };
}

describe("runBacktest — no-lookahead guarantee", () => {
  it("fills a breakout signal at the NEXT bar's open, never the signal bar's own close", () => {
    const bars: OHLCVBar[] = [];

    // Flat baseline (indices 0-63): close never exceeds the 20-day Donchian
    // upper channel (200), so no signal can fire here.
    for (let i = 0; i < 64; i++) bars.push(bar(i, 196, 200, 190, 195, 1000));

    // Index 64: a real, volume-confirmed breakout above the flat baseline's
    // channel (upper=200) — the ONLY bar in this series that should fire a
    // signal. Its own close (215) must never be used as the fill price.
    bars.push(bar(64, 196, 220, 190, 215, 2500));

    // Index 65: a distinctly different open (218, not 215) — this is what
    // the engine must use as the real fill price. If a lookahead bug ever
    // reintroduces bars[i].close as the fill, this test fails because
    // 218 !== 215.
    bars.push(bar(65, 218, 222, 214, 218, 1000));

    // Flat continuation (indices 66-69) — never touches the breakout's
    // stop (190) or target (265), so the trade runs to end_of_data.
    for (let i = 66; i < 70; i++) bars.push(bar(i, 218, 222, 214, 218, 1000));

    const result = runBacktest({
      strategyId: "breakout",
      symbol: "TEST",
      assetClass: "stocks",
      bars,
      strategyParams: BREAKOUT_DEFAULT_PARAMS,
      transactionCostBps: 0,
      walkForward: { windowDays: 70, stepDays: 70 },
    });

    expect(result.trades).toHaveLength(1);
    const trade = result.trades[0];

    expect(trade.direction).toBe("long");
    expect(trade.entryAt).toBe(dateAt(65));
    expect(trade.entryPrice).toBe(218); // bars[65].open — the real no-lookahead fill
    expect(trade.entryPrice).not.toBe(215); // bars[64].close — would indicate a reintroduced lookahead bug
    expect(trade.exitReason).toBe("end_of_data");
  });
});

describe("runBacktest — known-outcome synthetic uptrend", () => {
  it("opens exactly one winning long trade against a clean momentum setup", () => {
    // A perfectly linear uptrend (close +2/bar) makes every momentum
    // condition (fast SMA > slow SMA, close > slow SMA, positive ROC) true
    // from very early on, and a constant true range (=6) makes ATR exactly
    // 6 everywhere it's defined — so the stop/target levels are exact,
    // hand-computable numbers, not approximations.
    const bars: OHLCVBar[] = [];
    for (let i = 0; i < 69; i++) {
      const close = 200 + 2 * i;
      const open = 198 + 2 * i; // == close[i-1], continuous gapless series
      bars.push(bar(i, open, close + 2, open - 2, close, 1000));
    }

    const result = runBacktest({
      strategyId: "momentum",
      symbol: "TEST",
      assetClass: "stocks",
      bars,
      strategyParams: MOMENTUM_DEFAULT_PARAMS,
      transactionCostBps: 0,
      walkForward: { windowDays: 69, stepDays: 69 },
    });

    expect(result.trades).toHaveLength(1);
    const trade = result.trades[0];

    // Signal fires at engine index 60 (the walk-forward window's first
    // checked bar) off close[60]=320, atr=6: stop=320-12=308, target=320+18=338.
    expect(trade.direction).toBe("long");
    expect(trade.entryAt).toBe(dateAt(61));
    expect(trade.entryPrice).toBe(320); // bars[61].open
    expect(trade.exitReason).toBe("target");
    expect(trade.exitAt).toBe(dateAt(68)); // first bar whose high (338) reaches the target
    expect(trade.exitPrice).toBe(338);
    expect(trade.pnlPct).toBeCloseTo(5.625, 10); // (338-320)/320*100
    expect(trade.pnlUsd).toBeCloseTo(562.5, 10);

    expect(result.aggregate.totalTrades).toBe(1);
    expect(result.aggregate.winRatePct).toBe(100);
  });
});
