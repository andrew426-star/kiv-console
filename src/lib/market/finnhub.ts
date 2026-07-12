import { cacheLife } from "next/cache";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

export type Quote = {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
};

const NAV_TICKER_SYMBOLS: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "SPY" },
  { symbol: "QQQ", label: "QQQ" },
  { symbol: "AAPL", label: "AAPL" },
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "BINANCE:BTCUSDT", label: "BTC" },
  { symbol: "BINANCE:ETHUSDT", label: "ETH" },
];

export async function getQuotesFor(symbols: { symbol: string; label: string }[]): Promise<Quote[]> {
  "use cache";
  cacheLife("minutes");

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || symbols.length === 0) return [];

  const results = await Promise.allSettled(
    symbols.map(async ({ symbol, label }) => {
      const res = await fetch(
        `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
      );
      if (!res.ok) throw new Error(`Finnhub quote failed for ${symbol}: ${res.status}`);
      const data = (await res.json()) as { c: number; d: number; dp: number };
      if (!data.c) throw new Error(`Finnhub returned no price for ${symbol}`);
      return { symbol, label, price: data.c, change: data.d, changePercent: data.dp };
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === "fulfilled")
    .map((r) => r.value);
}

export async function getMarketQuotes(): Promise<Quote[]> {
  return getQuotesFor(NAV_TICKER_SYMBOLS);
}

// A rough existence/format check so a bad symbol fails fast in the add-
// to-watchlist form instead of just silently never appearing.
export async function quoteExists(symbol: string): Promise<boolean> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return false;
  try {
    const res = await fetch(
      `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`,
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { c: number };
    return Boolean(data.c);
  } catch {
    return false;
  }
}
