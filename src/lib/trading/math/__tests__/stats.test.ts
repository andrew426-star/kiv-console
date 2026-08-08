import { describe, expect, it } from "vitest";
import {
  mean,
  stdev,
  sma,
  ema,
  rateOfChange,
  atr,
  zScore,
  donchianChannel,
  sharpeRatio,
  maxDrawdownPct,
  winRatePct,
  profitFactor,
  totalReturnPct,
  clampConfidence,
} from "../stats";
import type { OHLCVBar, BacktestTrade } from "../../types";

function bar(date: string, high: number, low: number, close: number): OHLCVBar {
  return { date, open: close, high, low, close, volume: 1000 };
}

function trade(pnlPct: number): BacktestTrade {
  return {
    direction: "long",
    entryAt: "2026-01-01",
    entryPrice: 100,
    exitAt: "2026-01-02",
    exitPrice: 100 * (1 + pnlPct / 100),
    exitReason: "target",
    pnlPct,
    pnlUsd: pnlPct * 100,
  };
}

describe("mean", () => {
  it("averages a real array", () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
  });
  it("returns 0 for an empty array", () => {
    expect(mean([])).toBe(0);
  });
});

describe("stdev", () => {
  it("computes sample stdev by hand", () => {
    // mean=3, sum((x-3)^2)=10, variance=10/4=2.5, sd=sqrt(2.5)
    expect(stdev([1, 2, 3, 4, 5])).toBeCloseTo(Math.sqrt(2.5), 10);
  });
  it("returns 0 for fewer than 2 values", () => {
    expect(stdev([5])).toBe(0);
    expect(stdev([])).toBe(0);
  });
});

describe("sma", () => {
  it("matches hand-computed trailing averages, null before the window fills", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe("ema", () => {
  it("seeds with the SMA of the first period, then updates linearly for a linear input", () => {
    // A linear input series makes EMA track exactly like SMA at every step.
    expect(ema([1, 2, 3, 4, 5, 6], 3)).toEqual([null, null, 2, 3, 4, 5]);
  });
});

describe("rateOfChange", () => {
  it("matches hand-computed percentage change", () => {
    const result = rateOfChange([10, 20, 30, 40, 80], 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeNull();
    expect(result[2]).toBe(200); // (30-10)/10*100
    expect(result[3]).toBe(100); // (40-20)/20*100
    expect(result[4]).toBeCloseTo((166 + 2 / 3), 6); // (80-30)/30*100
  });
});

describe("atr", () => {
  it("is exactly constant when every bar's true range is constant", () => {
    // high-low=2 on every bar, and consecutive closes never gap beyond that,
    // so every true range equals exactly 2 — Wilder's smoothing of a
    // constant series stays exactly that constant.
    const bars: OHLCVBar[] = [
      bar("d0", 10, 8, 9),
      bar("d1", 11, 9, 10),
      bar("d2", 12, 10, 11),
      bar("d3", 13, 11, 12),
      bar("d4", 14, 12, 13),
    ];
    expect(atr(bars, 3)).toEqual([null, null, 2, 2, 2]);
  });
});

describe("zScore", () => {
  it("is exactly 1 at the top of a 3-window arithmetic sequence", () => {
    // For window [a, a+d, a+2d]: mean=a+d, sd=d, last point is (a+2d-mean)/sd = 1.
    expect(zScore([10, 12, 14, 16, 18], 3)).toEqual([null, null, 1, 1, 1]);
  });
});

describe("donchianChannel", () => {
  it("uses only the PRIOR period bars, excluding the current bar", () => {
    const bars: OHLCVBar[] = [
      bar("d0", 10, 5, 8),
      bar("d1", 12, 6, 9),
      bar("d2", 14, 7, 10),
      bar("d3", 16, 8, 12),
      bar("d4", 18, 9, 14),
    ];
    const { upper, lower } = donchianChannel(bars, 3);
    expect(upper).toEqual([null, null, null, 14, 16]);
    expect(lower).toEqual([null, null, null, 5, 6]);
  });
});

describe("sharpeRatio", () => {
  it("matches a hand-computed mean/stdev ratio", () => {
    // pnlPct=[10,30]: mean=20, sd=sqrt(200)=10*sqrt(2), sharpe=20/(10*sqrt(2))=sqrt(2)
    expect(sharpeRatio([trade(10), trade(30)])).toBeCloseTo(Math.sqrt(2), 10);
  });
  it("returns null for fewer than 2 trades", () => {
    expect(sharpeRatio([trade(10)])).toBeNull();
    expect(sharpeRatio([])).toBeNull();
  });
});

describe("maxDrawdownPct", () => {
  it("finds the largest peak-to-trough drop across compounded trades", () => {
    // 100 -> 110 (peak) -> 88 (20% down from peak) -> 92.4 (still 16% down from peak)
    expect(maxDrawdownPct([trade(10), trade(-20), trade(5)])).toBeCloseTo(20, 10);
  });
  it("returns null for no trades", () => {
    expect(maxDrawdownPct([])).toBeNull();
  });
});

describe("winRatePct", () => {
  it("counts positive-pnlUsd trades over total", () => {
    expect(winRatePct([trade(10), trade(-5), trade(20), trade(-1)])).toBe(50);
  });
  it("returns null for no trades", () => {
    expect(winRatePct([])).toBeNull();
  });
});

describe("profitFactor", () => {
  it("divides gross profit by gross loss", () => {
    // pnlUsd: 1000, -500, 2000, -1000 -> grossProfit=3000, grossLoss=1500 -> 2
    expect(profitFactor([trade(10), trade(-5), trade(20), trade(-10)])).toBe(2);
  });
  it("returns null when there are no losing trades", () => {
    expect(profitFactor([trade(10)])).toBeNull();
  });
  it("returns null for no trades", () => {
    expect(profitFactor([])).toBeNull();
  });
});

describe("totalReturnPct", () => {
  it("compounds trade returns sequentially", () => {
    // 100 * 1.1 * 1.1 = 121
    expect(totalReturnPct([trade(10), trade(10)])).toBeCloseTo(21, 10);
  });
  it("returns 0 for no trades", () => {
    expect(totalReturnPct([])).toBe(0);
  });
});

describe("clampConfidence", () => {
  it("averages sub-scores and clamps the average, not each part", () => {
    expect(clampConfidence([0.5, 0.7, 1.5])).toBeCloseTo(0.9, 10);
  });
  it("clamps an out-of-range average to [0, 1]", () => {
    expect(clampConfidence([2, 2])).toBe(1);
    expect(clampConfidence([-1, -1])).toBe(0);
  });
  it("returns 0 for an empty array", () => {
    expect(clampConfidence([])).toBe(0);
  });
});
