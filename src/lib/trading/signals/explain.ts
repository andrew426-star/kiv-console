import type { AssetClass } from "@/lib/market/alpaca-bars";
import type { StrategyId, StrategySignal } from "../types";

// What a signal means, for a person: the asset's common name, its
// reasoning in plain English, and sources to check it against. Written at
// scan time (generate.ts) onto the signal row, so K.I.V.'s Trading Signals
// card and Jarvis's Markets panel show the same words.
//
// The reasoning is rewritten from the strategy's own rationale lines, by
// pattern, never by a model: each line already records a real condition
// that fired, and the plain version keeps every number. The news is
// context only: every strategy here decides from daily price bars alone.

export interface SignalSource {
  kind: "data" | "news";
  title: string;
  publisher: string;
  url: string;
  publishedAt: string | null;
}

const STRATEGY_THESIS: Record<StrategyId, (long: boolean) => string> = {
  momentum: (long) =>
    long
      ? "Trend-following: the price trend is up and still building."
      : "Trend-following: the price trend is down and still building.",
  mean_reversion: () =>
    "Mean reversion: an unusually deep dip inside a steady trend, expected to snap back toward its average.",
  breakout: (long) =>
    long
      ? "Breakout: the price has pushed out of its recent range to the upside on heavy volume."
      : "Breakout: the price has broken down out of its recent range on heavy volume.",
  composite: () => "Ensemble: several independent strategies agree on this trade.",
};

const STRATEGY_LABEL: Record<string, string> = {
  momentum: "momentum",
  mean_reversion: "mean reversion",
  breakout: "breakout",
  composite: "ensemble",
};

function pctBetween(from: number, to: number): string {
  return `${Math.abs(((to - from) / from) * 100).toFixed(1)}%`;
}

function price(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toPrecision(4);
}

/** One rationale line in plain English. Unknown shapes pass through as written. */
export function plainLine(line: string): string {
  const tagged = line.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (tagged) return `${tagged[1]}: ${plainLine(tagged[2])}`;

  let m = line.match(/^close \(([\d.]+)\) (above|below) SMA\((\d+)\) \(([\d.]+)\)/);
  if (m) {
    const [, close, side, n, avg] = m;
    return `It closed at ${close}, ${pctBetween(Number(avg), Number(close))} ${side} its ${n}-day average (${avg}).`;
  }
  m = line.match(/^SMA\((\d+)\) (above|below) SMA\((\d+)\)( — fresh cross)?/);
  if (m) {
    const [, fast, side, slow, fresh] = m;
    return `Its ${fast}-day average is ${side} its ${slow}-day average${fresh ? ", having only just crossed" : ""}, so the ${side === "above" ? "up" : "down"}trend is confirmed.`;
  }
  m = line.match(/^(\d+)-bar rate of change (positive|negative) \((-?[\d.]+)%\)/);
  if (m) {
    const [, n, sign, rate] = m;
    return `It is ${sign === "positive" ? "up" : "down"} ${Math.abs(Number(rate)).toFixed(2)}% over the last ${n} sessions.`;
  }
  m = line.match(/^z-score of close vs (\d+)-day mean is (-?[\d.]+)/);
  if (m) {
    const [, n, z] = m;
    return `It is ${Math.abs(Number(z)).toFixed(2)} standard deviations below its ${n}-day average, an unusually deep dip.`;
  }
  m = line.match(/^(\d+)-day trend is flat-to-up over the last (\d+) bars/);
  if (m) {
    return `Its ${m[1]}-day trend is flat to rising over the last ${m[2]} sessions, so this is a dip in an intact trend rather than a collapse.`;
  }
  m = line.match(/^stop set at the lower of the (\d+)-day swing low/);
  if (m) return `The stop sits just under the ${m[1]}-day swing low.`;
  m = line.match(/^close \(([\d.]+)\) broke (above|below) the prior (\d+)-day (high|low) \(([\d.]+)\)/);
  if (m) {
    const [, close, side, n, edge, level] = m;
    return `It closed at ${close}, breaking ${side} its ${n}-day ${edge} of ${level}.`;
  }
  m = line.match(/^volume ([\d.]+)x the (\d+)-day average/);
  if (m) return `Volume was ${m[1]}× its ${m[2]}-day average, which backs the move.`;
  m = line.match(/^(\d) of 3 strategies agree on (long|short): (.*)$/);
  if (m) return `${m[1]} of 3 strategies agree on a ${m[2]} (${m[3].replace(/_/g, " ")}).`;
  return line;
}

/** The signal's reasoning as a short paragraph. */
export function explainSignal(
  signal: Pick<StrategySignal, "direction" | "entry" | "stop" | "target" | "rationale">,
  strategyId: StrategyId,
  assetName: string,
): string {
  const long = signal.direction === "long";
  const facts = signal.rationale.map(plainLine);
  const risk = Math.abs(signal.entry - signal.stop);
  const reward = Math.abs(signal.target - signal.entry);
  const ratio = risk > 0 ? (reward / risk).toFixed(1) : null;
  // "Palladium (PALL ETF proxy)" reads as "Palladium, through the PALL ETF,".
  const proxy = assetName.match(/^(.*?)\s*\((\S+) ETF proxy\)$/);
  const subject = proxy ? `${proxy[1]}, through the ${proxy[2]} ETF,` : `${assetName},`;
  return [
    `${subject} ${STRATEGY_LABEL[strategyId] ?? strategyId} ${long ? "long" : "short"}.`,
    STRATEGY_THESIS[strategyId]?.(long) ?? "",
    ...facts,
    `Entry ${price(signal.entry)}; the stop at ${price(signal.stop)} (${pctBetween(signal.entry, signal.stop)} ${long ? "below" : "above"}) caps the loss, and the target at ${price(signal.target)} (${pctBetween(signal.entry, signal.target)} ${long ? "above" : "below"}) aims for${ratio ? ` ${ratio}x` : ""} the risk.`,
  ]
    .filter(Boolean)
    .join(" ");
}

// ---- sources

const FINNHUB_BASE = "https://finnhub.io/api/v1";
const NEWS_TIMEOUT_MS = 6000;
const MAX_NEWS = 3;

/** The words an article about this asset would use. ETF proxies are about
 *  the thing they track ("Palladium (PALL ETF proxy)" -> palladium). */
function keywords(symbol: string, assetName: string): string[] {
  const base = symbol.split("/")[0];
  const name = assetName.replace(/\(.*?\)/g, "").trim();
  const words = [base, name, name.split(" ")[0]].filter((w) => w && w.length > 1);
  return [...new Set(words.map((w) => w.toLowerCase()))];
}

/** A public chart of the asset, to check the price action against. */
export function chartSource(symbol: string, assetClass: AssetClass): SignalSource {
  const quote = assetClass === "crypto" ? symbol.replace("/", "-") : symbol;
  return {
    kind: "data",
    title: `${symbol} price chart`,
    publisher: "Yahoo Finance",
    url: `https://finance.yahoo.com/quote/${encodeURIComponent(quote)}`,
    publishedAt: null,
  };
}

type FinnhubNews = { headline?: string; summary?: string; source?: string; url?: string; datetime?: number };

async function finnhubNews(path: string): Promise<FinnhubNews[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch(`${FINNHUB_BASE}${path}&token=${apiKey}`, {
      signal: AbortSignal.timeout(NEWS_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as FinnhubNews[]) : [];
  } catch {
    return [];
  }
}

/** Recent headlines about the asset, newest first: the company's own feed
 *  for stocks and ETFs, the crypto feed for coins, and the general feed
 *  filtered to the commodity for metal and futures proxies. Only items whose
 *  headline names the asset are kept. Never throws: no news is just no news. */
export async function newsSources(symbol: string, assetClass: AssetClass, assetName: string, now = new Date()): Promise<SignalSource[]> {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 4 * 86_400_000);
  let items: FinnhubNews[];
  if (assetClass === "crypto") {
    items = await finnhubNews(`/news?category=crypto`);
  } else {
    items = await finnhubNews(`/company-news?symbol=${encodeURIComponent(symbol)}&from=${day(from)}&to=${day(now)}`);
    if (items.length === 0 && assetClass !== "stocks") items = await finnhubNews(`/news?category=general`);
  }
  const words = keywords(symbol, assetName);
  return items
    .filter((item) => {
      if (!item.url || !item.headline) return false;
      // The headline has to be about it; a passing mention in the summary is not.
      const text = item.headline.toLowerCase();
      return words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text));
    })
    .sort((a, b) => (b.datetime ?? 0) - (a.datetime ?? 0))
    .slice(0, MAX_NEWS)
    .map((item) => ({
      kind: "news" as const,
      title: item.headline!,
      publisher: item.source ?? "",
      url: item.url!,
      publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : null,
    }));
}

export type SignalContext = { assetName: string; summary: string; sources: SignalSource[] };

export async function signalContext(
  signal: StrategySignal,
  strategyId: StrategyId,
  symbol: string,
  assetClass: AssetClass,
  assetName: string,
  withNews: boolean,
): Promise<SignalContext> {
  const news = withNews ? await newsSources(symbol, assetClass, assetName) : [];
  return {
    assetName,
    summary: explainSignal(signal, strategyId, assetName),
    sources: [chartSource(symbol, assetClass), ...news],
  };
}

