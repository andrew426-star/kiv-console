import { describe, expect, it } from "vitest";
import { chartSource, explainSignal, plainLine } from "../explain";

describe("plainLine", () => {
  it("rewrites every strategy's rationale lines, keeping their numbers", () => {
    expect(plainLine("close (21.27) below SMA(50) (23.78)")).toBe(
      "It closed at 21.27, 10.6% below its 50-day average (23.78).",
    );
    expect(plainLine("SMA(20) above SMA(50) — fresh cross")).toBe(
      "Its 20-day average is above its 50-day average, having only just crossed, so the uptrend is confirmed.",
    );
    expect(plainLine("10-bar rate of change negative (-10.05%)")).toBe("It is down 10.05% over the last 10 sessions.");
    expect(plainLine("z-score of close vs 20-day mean is -2.31 (below -2)")).toContain("2.31 standard deviations below its 20-day average");
    expect(plainLine("50-day trend is flat-to-up over the last 10 bars (not a falling-knife setup)")).toContain("flat to rising");
    expect(plainLine("close (517.32) broke above the prior 20-day high (510.00)")).toBe(
      "It closed at 517.32, breaking above its 20-day high of 510.00.",
    );
    expect(plainLine("volume 1.85x the 20-day average")).toBe("Volume was 1.85× its 20-day average, which backs the move.");
    expect(plainLine("2 of 3 strategies agree on long: momentum, breakout")).toBe(
      "2 of 3 strategies agree on a long (momentum, breakout).",
    );
    expect(plainLine("[momentum] 10-bar rate of change positive (0.43%)")).toBe(
      "momentum: It is up 0.43% over the last 10 sessions.",
    );
  });

  it("passes an unknown line through untouched", () => {
    expect(plainLine("something new")).toBe("something new");
  });
});

describe("explainSignal", () => {
  it("names the asset, the idea, the facts and the risk", () => {
    const text = explainSignal(
      {
        direction: "short",
        entry: 21.265,
        stop: 22.604,
        target: 19.256,
        rationale: ["close (21.27) below SMA(50) (23.78)"],
      },
      "momentum",
      "Palladium (PALL ETF proxy)",
    );
    expect(text).toMatch(/^Palladium, through the PALL ETF, momentum short\. Trend-following: the price trend is down/);
    expect(text).toContain("10.6% below its 50-day average");
    expect(text).toContain("the stop at 22.60 (6.3% above)");
    expect(text).toContain("the target at 19.26 (9.4% below) aims for 1.5x the risk");
  });
});

describe("chartSource", () => {
  it("links coins in Yahoo's BTC-USD form", () => {
    expect(chartSource("BTC/USD", "crypto").url).toBe("https://finance.yahoo.com/quote/BTC-USD");
    expect(chartSource("NVDA", "stocks").url).toBe("https://finance.yahoo.com/quote/NVDA");
  });
});
