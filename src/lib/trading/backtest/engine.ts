import type {
  BacktestParams,
  BacktestResult,
  BacktestTrade,
  Direction,
  ExitReason,
  OHLCVBar,
  StrategyId,
  StrategyParams,
  WindowResult,
} from "../types";
import { STRATEGY_REGISTRY } from "../strategies";
import { sharpeRatio, maxDrawdownPct, winRatePct, profitFactor, totalReturnPct } from "../math/stats";

// The longest lookback any strategy actually uses (momentum's default
// slowPeriod=50, mean-reversion's trendPeriod+trendSlopeLookback=60) —
// below this, a strategy has no real signal to give, so the engine
// doesn't even ask.
const MIN_BARS_FOR_SIGNAL = 60;

function buildTrade(
  direction: Direction,
  entryAt: string,
  entryPrice: number,
  exitAt: string,
  exitPrice: number,
  exitReason: ExitReason,
): BacktestTrade {
  const pnlPct =
    direction === "long" ? ((exitPrice - entryPrice) / entryPrice) * 100 : ((entryPrice - exitPrice) / entryPrice) * 100;
  return {
    direction,
    entryAt,
    entryPrice,
    exitAt,
    exitPrice,
    exitReason,
    pnlPct,
    // Per $100 of notional — a normalized unit for comparing strategies/
    // symbols on equal footing, not a claim about any real position size
    // (real sizing is risk/limits.ts's job, applied to live signals, not
    // to this backtest).
    pnlUsd: pnlPct * 100,
  };
}

// No lookahead, by construction: the caller only ever passes signalIndex
// values whose strategy decision was made from bars[0..signalIndex] —
// the earliest this function ever fills is bars[signalIndex + 1].open,
// never the signal bar's own close. Stop is checked before target on any
// bar where both could plausibly have been touched — daily bars don't
// reveal real intrabar order, and assuming the worse outcome is the
// honest bias for a backtest that has to be trustworthy, not flattering.
function simulateOneTrade(
  bars: OHLCVBar[],
  signalIndex: number,
  direction: Direction,
  stop: number,
  target: number,
  transactionCostBps: number,
): BacktestTrade | null {
  const entryBarIndex = signalIndex + 1;
  if (entryBarIndex >= bars.length) return null;

  const entryBar = bars[entryBarIndex];
  const costMultiplier = transactionCostBps / 10000;
  const entryPrice = direction === "long" ? entryBar.open * (1 + costMultiplier) : entryBar.open * (1 - costMultiplier);

  for (let j = entryBarIndex; j < bars.length; j++) {
    const bar = bars[j];
    if (direction === "long") {
      if (bar.low <= stop) {
        return buildTrade(direction, entryBar.date, entryPrice, bar.date, stop * (1 - costMultiplier), "stop");
      }
      if (bar.high >= target) {
        return buildTrade(direction, entryBar.date, entryPrice, bar.date, target * (1 - costMultiplier), "target");
      }
    } else {
      if (bar.high >= stop) {
        return buildTrade(direction, entryBar.date, entryPrice, bar.date, stop * (1 + costMultiplier), "stop");
      }
      if (bar.low <= target) {
        return buildTrade(direction, entryBar.date, entryPrice, bar.date, target * (1 + costMultiplier), "target");
      }
    }
  }

  // Never hit stop or target within the available data — force-close at
  // the last bar's close, cost-adjusted the same way a real exit is.
  const lastBar = bars[bars.length - 1];
  const exitPrice = direction === "long" ? lastBar.close * (1 - costMultiplier) : lastBar.close * (1 + costMultiplier);
  return buildTrade(direction, entryBar.date, entryPrice, lastBar.date, exitPrice, "end_of_data");
}

// Walks forward looking for signals only while startIdx <= i < endIdx,
// but ALWAYS feeds the strategy the full bars[0..i] history — a walk-
// forward window restricts which DECISIONS get made and counted, it
// doesn't blind the strategy's indicators to real prior history the way
// slicing the bars array per-window would. A trade opened near a
// window's end is allowed to play out using bars beyond endIdx (a real
// trade doesn't close just because an arbitrary window boundary passed).
function simulateTradesInRange(
  strategyId: StrategyId,
  bars: OHLCVBar[],
  startIdx: number,
  endIdx: number,
  strategyParams: StrategyParams,
  transactionCostBps: number,
): BacktestTrade[] {
  const strategy = STRATEGY_REGISTRY[strategyId];
  const trades: BacktestTrade[] = [];
  let i = Math.max(startIdx, MIN_BARS_FOR_SIGNAL);

  while (i < endIdx && i < bars.length) {
    const historySoFar = bars.slice(0, i + 1);
    const signal = strategy.run(historySoFar, strategyParams);
    if (signal) {
      const trade = simulateOneTrade(bars, i, signal.direction, signal.stop, signal.target, transactionCostBps);
      if (trade) {
        trades.push(trade);
        // No overlapping positions in a single-symbol backtest — jump to
        // the bar the trade closed on before looking for the next signal.
        // This is also what maxDrawdownPct's sequential-compounding
        // equity curve assumes: exactly one position open at a time.
        const exitIndex = bars.findIndex((b, idx) => idx > i && b.date === trade.exitAt);
        i = exitIndex > i ? exitIndex + 1 : i + 1;
        continue;
      }
    }
    i++;
  }

  return trades;
}

export function runBacktest(params: BacktestParams): BacktestResult {
  const { bars, strategyId, strategyParams, transactionCostBps, walkForward } = params;
  const windows: WindowResult[] = [];

  let windowStartIdx = MIN_BARS_FOR_SIGNAL;
  while (windowStartIdx < bars.length) {
    const windowEndIdx = Math.min(windowStartIdx + walkForward.windowDays, bars.length);
    const trades = simulateTradesInRange(strategyId, bars, windowStartIdx, windowEndIdx, strategyParams, transactionCostBps);
    windows.push({
      windowStart: bars[windowStartIdx].date,
      windowEnd: bars[windowEndIdx - 1].date,
      trades,
      totalReturnPct: totalReturnPct(trades),
    });
    windowStartIdx += walkForward.stepDays;
  }

  const allTrades = windows.flatMap((w) => w.trades);

  return {
    windows,
    aggregate: {
      sharpeRatio: sharpeRatio(allTrades),
      maxDrawdownPct: maxDrawdownPct(allTrades),
      winRatePct: winRatePct(allTrades),
      profitFactor: profitFactor(allTrades),
      totalReturnPct: totalReturnPct(allTrades),
      totalTrades: allTrades.length,
    },
    trades: allTrades,
  };
}
