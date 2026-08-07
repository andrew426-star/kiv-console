import { getAssetMoves, getAssetHistory, type AssetClass, type AssetMove } from "@/lib/market/alpaca-bars";
import { getNewsByCategory } from "@/lib/news/newsapi";

const VALID_ASSET_CLASSES: AssetClass[] = ["stocks", "crypto", "metals", "futures"];

function parseAssetClasses(input: unknown): AssetClass[] {
  if (!Array.isArray(input)) return VALID_ASSET_CLASSES;
  const filtered = input.filter((v): v is AssetClass => VALID_ASSET_CLASSES.includes(v as AssetClass));
  return filtered.length > 0 ? filtered : VALID_ASSET_CLASSES;
}

export type MarketMoversForAgentResult =
  | { connected: false }
  | {
      connected: true;
      periodDays: number;
      topGainers: AssetMove[];
      topLosers: AssetMove[];
      fetchErrors: string[];
    };

// Cross-asset-class weekly (or custom-period) leaderboard for Ticker's
// "what's the highest-returning asset" / "largest movers" questions —
// backs both framings off the same real Alpaca-bars data.
export async function getMarketMoversForAgent(args: {
  periodDays?: number;
  assetClasses?: unknown;
  limit?: number;
}): Promise<MarketMoversForAgentResult> {
  const periodDays = args.periodDays && args.periodDays > 0 ? Math.round(args.periodDays) : 7;
  const assetClasses = parseAssetClasses(args.assetClasses);
  const limit = args.limit && args.limit > 0 ? Math.round(args.limit) : 10;

  const result = await getAssetMoves(periodDays, assetClasses);
  if (!result.connected) return { connected: false };

  const sorted = [...result.moves].sort((a, b) => b.changePercent - a.changePercent);
  return {
    connected: true,
    periodDays: result.periodDays,
    topGainers: sorted.slice(0, limit),
    topLosers: sorted.slice(-limit).reverse(),
    fetchErrors: result.fetchErrors,
  };
}

export type MarketSentimentReportResult =
  | { connected: false }
  | {
      connected: true;
      periodDays: number;
      breadth: { tracked: number; up: number; down: number; averageChangePercent: number };
      topGainers: AssetMove[];
      topLosers: AssetMove[];
      recentMarketHeadlines: { title: string; source: string; url: string; publishedAt: string }[];
    };

// Breadth stats computed from the same real bars data (no fabricated
// "sentiment score") plus real recent market-moving headlines (reusing
// the existing Intel Hub NewsAPI integration, zero new credential) — the
// tool returns only real, grounded data; Gemini does the prose synthesis
// when the agent replies, same "AI narrates, never invents" discipline
// used elsewhere in this codebase.
export async function getMarketSentimentReportForAgent(): Promise<MarketSentimentReportResult> {
  const [movesResult, headlines] = await Promise.all([
    getAssetMoves(7, VALID_ASSET_CLASSES),
    getNewsByCategory("market-moves").catch(() => []),
  ]);
  if (!movesResult.connected) return { connected: false };

  const moves = movesResult.moves;
  const up = moves.filter((m) => m.changePercent > 0).length;
  const down = moves.filter((m) => m.changePercent < 0).length;
  const averageChangePercent =
    moves.length > 0 ? moves.reduce((sum, m) => sum + m.changePercent, 0) / moves.length : 0;

  const sorted = [...moves].sort((a, b) => b.changePercent - a.changePercent);

  return {
    connected: true,
    periodDays: movesResult.periodDays,
    breadth: { tracked: moves.length, up, down, averageChangePercent },
    topGainers: sorted.slice(0, 5),
    topLosers: sorted.slice(-5).reverse(),
    recentMarketHeadlines: headlines.slice(0, 6).map((a) => ({
      title: a.title,
      source: a.source,
      url: a.url,
      publishedAt: a.publishedAt,
    })),
  };
}

// Single-asset price-history drill-down — grounds any "what do you think
// about X" commentary in real recent closes instead of an ungrounded
// guess.
export async function getAssetHistoryForAgent(args: {
  symbol: string;
  assetClass?: string;
  days?: number;
}) {
  const symbol = args.symbol.trim();
  const assetClass = VALID_ASSET_CLASSES.includes(args.assetClass as AssetClass)
    ? (args.assetClass as AssetClass)
    : symbol.includes("/")
      ? "crypto"
      : "stocks";
  const days = args.days && args.days > 0 ? Math.round(args.days) : 14;
  return getAssetHistory(symbol, assetClass, days);
}
