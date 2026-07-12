import { cacheLife } from "next/cache";

const FINNHUB_BASE = "https://finnhub.io/api/v1";

export type Quote = {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
};

const WATCHLIST: { symbol: string; label: string }[] = [
  { symbol: "SPY", label: "SPY" },
  { symbol: "QQQ", label: "QQQ" },
  { symbol: "AAPL", label: "AAPL" },
  { symbol: "NVDA", label: "NVDA" },
  { symbol: "BINANCE:BTCUSDT", label: "BTC" },
  { symbol: "BINANCE:ETHUSDT", label: "ETH" },
];

export async function getMarketQuotes(): Promise<Quote[]> {
  "use cache";
  cacheLife("minutes");

  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return [];

  const results = await Promise.allSettled(
    WATCHLIST.map(async ({ symbol, label }) => {
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
