import { connection } from "next/server";

// Historical daily bars for a curated cross-asset-class universe, via
// Alpaca's Market Data API — reuses the same ALPACA_API_KEY_ID/
// ALPACA_SECRET_KEY already configured for lib/portfolio/alpaca.ts's
// account/positions calls, no new credential needed. Confirmed live
// against the real account: the plain /v2/stocks/bars call 403s
// ("subscription does not permit querying recent SIP data") — this
// account's plan only allows the free IEX feed (feed=iex), which does
// work for equities/ETFs. Crypto bars are a separate endpoint
// (v1beta3/crypto/us/bars) and need no feed param.
const DATA_BASE_URL = "https://data.alpaca.markets";
const BARS_TIMEOUT_MS = 8000;

export type AssetClass = "stocks" | "crypto" | "metals" | "futures";

export interface TrackedAsset {
  symbol: string;
  label: string;
}

// A broad, real, liquid universe per class — not literally every symbol
// on the market (no screener endpoint is available on this Alpaca plan),
// but wide enough across recognizable names to give genuine "largest
// mover" signal. Metals and Futures have no raw spot-price/contract feed
// on this plan at all — represented via real, heavily-traded tracking
// ETFs instead. Every label says "proxy" so this is never mistaken for a
// literal spot or futures-contract price.
export const STOCK_UNIVERSE: TrackedAsset[] = [
  { symbol: "AAPL", label: "Apple" },
  { symbol: "MSFT", label: "Microsoft" },
  { symbol: "NVDA", label: "Nvidia" },
  { symbol: "GOOGL", label: "Alphabet" },
  { symbol: "AMZN", label: "Amazon" },
  { symbol: "META", label: "Meta" },
  { symbol: "TSLA", label: "Tesla" },
  { symbol: "JPM", label: "JPMorgan Chase" },
  { symbol: "V", label: "Visa" },
  { symbol: "UNH", label: "UnitedHealth" },
  { symbol: "XOM", label: "Exxon Mobil" },
  { symbol: "JNJ", label: "Johnson & Johnson" },
  { symbol: "WMT", label: "Walmart" },
  { symbol: "MA", label: "Mastercard" },
  { symbol: "HD", label: "Home Depot" },
  { symbol: "CVX", label: "Chevron" },
  { symbol: "KO", label: "Coca-Cola" },
  { symbol: "BAC", label: "Bank of America" },
  { symbol: "NFLX", label: "Netflix" },
  { symbol: "AMD", label: "AMD" },
  { symbol: "CRM", label: "Salesforce" },
  { symbol: "DIS", label: "Disney" },
  { symbol: "ORCL", label: "Oracle" },
  { symbol: "ADBE", label: "Adobe" },
  { symbol: "PYPL", label: "PayPal" },
];

export const CRYPTO_UNIVERSE: TrackedAsset[] = [
  { symbol: "BTC/USD", label: "Bitcoin" },
  { symbol: "ETH/USD", label: "Ethereum" },
  { symbol: "SOL/USD", label: "Solana" },
  { symbol: "DOGE/USD", label: "Dogecoin" },
  { symbol: "LTC/USD", label: "Litecoin" },
  { symbol: "LINK/USD", label: "Chainlink" },
  { symbol: "AVAX/USD", label: "Avalanche" },
  { symbol: "DOT/USD", label: "Polkadot" },
  { symbol: "UNI/USD", label: "Uniswap" },
  { symbol: "AAVE/USD", label: "Aave" },
];

export const METAL_UNIVERSE: TrackedAsset[] = [
  { symbol: "GLD", label: "Gold (GLD ETF proxy)" },
  { symbol: "SLV", label: "Silver (SLV ETF proxy)" },
  { symbol: "PPLT", label: "Platinum (PPLT ETF proxy)" },
  { symbol: "PALL", label: "Palladium (PALL ETF proxy)" },
];

export const FUTURES_UNIVERSE: TrackedAsset[] = [
  { symbol: "USO", label: "Crude Oil (USO ETF proxy)" },
  { symbol: "UNG", label: "Natural Gas (UNG ETF proxy)" },
  { symbol: "DBC", label: "Broad Commodities (DBC ETF proxy)" },
  { symbol: "DBA", label: "Agriculture (DBA ETF proxy)" },
  { symbol: "CPER", label: "Copper (CPER ETF proxy)" },
];

function universeFor(assetClass: AssetClass): TrackedAsset[] {
  switch (assetClass) {
    case "stocks":
      return STOCK_UNIVERSE;
    case "crypto":
      return CRYPTO_UNIVERSE;
    case "metals":
      return METAL_UNIVERSE;
    case "futures":
      return FUTURES_UNIVERSE;
  }
}

export interface AssetMove {
  symbol: string;
  label: string;
  assetClass: AssetClass;
  startPrice: number;
  endPrice: number;
  changePercent: number;
  asOf: string;
}

interface AlpacaBar {
  c: number;
  o: number;
  h: number;
  l: number;
  v: number;
  t: string;
}

// Alpaca's `limit` on a multi-symbol bars request caps TOTAL bars across
// every symbol combined, not per-symbol — confirmed live: a limit of 20
// against 9 symbols silently truncated to the first ~3 (alphabetically).
// Sized generously per-symbol so nothing gets silently dropped.
const BARS_PER_SYMBOL_LIMIT = 15;

async function fetchEquityBars(
  symbols: string[],
  startISO: string,
  endISO: string,
  headers: Record<string, string>,
  limit: number = symbols.length * BARS_PER_SYMBOL_LIMIT,
): Promise<Record<string, AlpacaBar[]>> {
  if (symbols.length === 0) return {};
  const url = `${DATA_BASE_URL}/v2/stocks/bars?symbols=${encodeURIComponent(symbols.join(","))}&timeframe=1Day&start=${startISO}&end=${endISO}&limit=${limit}&feed=iex`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(BARS_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Alpaca stock/ETF bars failed: ${await res.text()}`);
  const data = (await res.json()) as { bars?: Record<string, AlpacaBar[]> };
  return data.bars ?? {};
}

async function fetchCryptoBars(
  symbols: string[],
  startISO: string,
  endISO: string,
  headers: Record<string, string>,
  limit: number = symbols.length * BARS_PER_SYMBOL_LIMIT,
): Promise<Record<string, AlpacaBar[]>> {
  if (symbols.length === 0) return {};
  const url = `${DATA_BASE_URL}/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(symbols.join(","))}&timeframe=1Day&start=${startISO}&end=${endISO}&limit=${limit}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(BARS_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Alpaca crypto bars failed: ${await res.text()}`);
  const data = (await res.json()) as { bars?: Record<string, AlpacaBar[]> };
  return data.bars ?? {};
}

function movesFromBars(
  assets: TrackedAsset[],
  assetClass: AssetClass,
  barsBySymbol: Record<string, AlpacaBar[]>,
): AssetMove[] {
  const moves: AssetMove[] = [];
  for (const asset of assets) {
    const bars = barsBySymbol[asset.symbol];
    if (!bars || bars.length < 2) continue;
    const first = bars[0];
    const last = bars[bars.length - 1];
    if (!first.c) continue;
    moves.push({
      symbol: asset.symbol,
      label: asset.label,
      assetClass,
      startPrice: first.c,
      endPrice: last.c,
      changePercent: ((last.c - first.c) / first.c) * 100,
      asOf: last.t,
    });
  }
  return moves;
}

export type AssetMovesResult =
  | { connected: false }
  | { connected: true; moves: AssetMove[]; periodDays: number; fetchErrors: string[] };

// periodDays is calendar days, not trading days — padded internally so a
// 7-day request still safely spans a full trading week across weekends.
export async function getAssetMoves(
  periodDays = 7,
  assetClasses: AssetClass[] = ["stocks", "crypto", "metals", "futures"],
): Promise<AssetMovesResult> {
  await connection();
  const keyId = process.env.ALPACA_API_KEY_ID;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  if (!keyId || !secretKey) return { connected: false };
  const headers = { "APCA-API-KEY-ID": keyId, "APCA-API-SECRET-KEY": secretKey };

  const end = new Date();
  const start = new Date(end.getTime() - (periodDays + 3) * 24 * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  const equityAssets = [
    ...(assetClasses.includes("stocks") ? STOCK_UNIVERSE : []),
    ...(assetClasses.includes("metals") ? METAL_UNIVERSE : []),
    ...(assetClasses.includes("futures") ? FUTURES_UNIVERSE : []),
  ];
  const cryptoAssets = assetClasses.includes("crypto") ? CRYPTO_UNIVERSE : [];

  const fetchErrors: string[] = [];
  const [equityBars, cryptoBars] = await Promise.all([
    fetchEquityBars(equityAssets.map((a) => a.symbol), startISO, endISO, headers).catch((err) => {
      fetchErrors.push(err instanceof Error ? err.message : "equity/ETF bars failed");
      return {};
    }),
    fetchCryptoBars(cryptoAssets.map((a) => a.symbol), startISO, endISO, headers).catch((err) => {
      fetchErrors.push(err instanceof Error ? err.message : "crypto bars failed");
      return {};
    }),
  ]);

  const moves = assetClasses.flatMap((assetClass) =>
    movesFromBars(universeFor(assetClass), assetClass, assetClass === "crypto" ? cryptoBars : equityBars),
  );

  return { connected: true, moves, periodDays, fetchErrors };
}

// Single-symbol daily closes for a lookback window — backs deeper
// per-asset drill-down (e.g. "what's SOL done the last 2 weeks") so
// Ticker's commentary on a specific asset is grounded in real price
// history rather than an ungrounded guess.
export type AssetHistoryResult =
  | { connected: false }
  | { connected: true; symbol: string; bars: { date: string; close: number }[] }
  | { connected: true; symbol: string; error: string };

export async function getAssetHistory(
  symbol: string,
  assetClass: AssetClass,
  days = 14,
): Promise<AssetHistoryResult> {
  await connection();
  const keyId = process.env.ALPACA_API_KEY_ID;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  if (!keyId || !secretKey) return { connected: false };
  const headers = { "APCA-API-KEY-ID": keyId, "APCA-API-SECRET-KEY": secretKey };

  const end = new Date();
  const start = new Date(end.getTime() - (days + 3) * 24 * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  try {
    const barsBySymbol =
      assetClass === "crypto"
        ? await fetchCryptoBars([symbol], startISO, endISO, headers)
        : await fetchEquityBars([symbol], startISO, endISO, headers);
    const bars = barsBySymbol[symbol];
    if (!bars || bars.length === 0) {
      return { connected: true, symbol, error: `No price history found for ${symbol}.` };
    }
    return { connected: true, symbol, bars: bars.map((b) => ({ date: b.t, close: b.c })) };
  } catch (err) {
    return { connected: true, symbol, error: err instanceof Error ? err.message : "Bars fetch failed" };
  }
}

// Full OHLCV history for one symbol — a superset of getAssetHistory's
// close-only shape, needed for the trading engine's strategy math (ATR,
// Donchian channels, volume confirmation all need more than just close).
// Fetched per-symbol rather than batched like getAssetMoves: a single
// symbol's full lookback comfortably fits one request's page size, so
// there's no need to reason about Alpaca's cross-symbol `limit` cap here.
export type FullBarHistoryResult =
  | { connected: false }
  | { connected: true; symbol: string; bars: { date: string; open: number; high: number; low: number; close: number; volume: number }[] }
  | { connected: true; symbol: string; error: string };

export async function getFullBarHistory(
  symbol: string,
  assetClass: AssetClass,
  days: number,
): Promise<FullBarHistoryResult> {
  await connection();
  const keyId = process.env.ALPACA_API_KEY_ID;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  if (!keyId || !secretKey) return { connected: false };
  const headers = { "APCA-API-KEY-ID": keyId, "APCA-API-SECRET-KEY": secretKey };

  const end = new Date();
  const start = new Date(end.getTime() - (days + 3) * 24 * 60 * 60 * 1000);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  try {
    // A single symbol's whole lookback fits comfortably in one request at
    // daily granularity (confirmed live: ~275 daily bars for 13 months),
    // so BARS_PER_SYMBOL_LIMIT-style sizing isn't tight here — a
    // generous fixed multiple is enough without page_token pagination.
    const barsBySymbol =
      assetClass === "crypto"
        ? await fetchCryptoBars([symbol], startISO, endISO, headers, 5000)
        : await fetchEquityBars([symbol], startISO, endISO, headers, 5000);
    const bars = barsBySymbol[symbol];
    if (!bars || bars.length === 0) {
      return { connected: true, symbol, error: `No price history found for ${symbol}.` };
    }
    return {
      connected: true,
      symbol,
      bars: bars.map((b) => ({ date: b.t, open: b.o, high: b.h, low: b.l, close: b.c, volume: b.v })),
    };
  } catch (err) {
    return { connected: true, symbol, error: err instanceof Error ? err.message : "Bars fetch failed" };
  }
}
