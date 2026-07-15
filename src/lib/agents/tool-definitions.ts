import type { GeminiFunctionDeclaration, GeminiTool } from "@/lib/ai/gemini";
import { getMarketQuotes, getQuotesFor } from "@/lib/market/finnhub";
import { getNewsFeed } from "@/lib/news/newsapi";
import { webSearch } from "./tools/web-search";
import { getWatchlistForAgent } from "./tools/watchlist";
import { getCalendarEventsForAgent } from "./tools/calendar";
import { getCompanyStatsForAgent } from "./tools/company-stats";

// A custom function tool backed by Tavily (see tools/web-search.ts), not
// Gemini's built-in googleSearch grounding — that requires billing enabled
// even on an otherwise-free project. Being a regular function declaration
// (not a built-in tool) also means it can be freely combined with other
// custom tools in the same request, unlike googleSearch.
const WEB_SEARCH_DECL: GeminiFunctionDeclaration = {
  name: "web_search",
  description:
    "Search the web for current information. Use for anything requiring up-to-date or external facts you don't already know.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: { type: "STRING", description: "The search query." },
    },
    required: ["query"],
  },
};

const NEWS_FEED_DECL: GeminiFunctionDeclaration = {
  name: "get_news_feed",
  description:
    "Get the latest curated Fintech / AI-automation / alternative-investment news headlines Kivaro tracks.",
  parameters: { type: "OBJECT", properties: {} },
};

const MARKET_QUOTES_DECL: GeminiFunctionDeclaration = {
  name: "get_market_quotes",
  description:
    "Get live price quotes. Pass specific ticker symbols, or omit to get Kivaro's default market snapshot (SPY, QQQ, AAPL, NVDA, BTC, ETH).",
  parameters: {
    type: "OBJECT",
    properties: {
      symbols: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          'Ticker symbols to quote, e.g. ["AAPL", "BINANCE:BTCUSDT"]. Omit for the default snapshot.',
      },
    },
  },
};

const WATCHLIST_DECL: GeminiFunctionDeclaration = {
  name: "get_watchlist",
  description: "Get Kivaro's tracked investment watchlist with live price quotes.",
  parameters: { type: "OBJECT", properties: {} },
};

const CALENDAR_DECL: GeminiFunctionDeclaration = {
  name: "get_calendar_events",
  description: "Get Andrew's upcoming calendar events for the next 14 days.",
  parameters: { type: "OBJECT", properties: {} },
};

const COMPANY_STATS_DECL: GeminiFunctionDeclaration = {
  name: "get_company_stats",
  description:
    "Get Kivaro's current operational stats: active projects, total clients, and task counts by status. This is operational data, not a financial P&L — there is no finance ledger table yet.",
  parameters: { type: "OBJECT", properties: {} },
};

// name -> handler, used by the agent loop (src/lib/agents/respond.ts) once
// Gemini requests a function call by name.
const HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  web_search: async (args) => webSearch(String(args.query ?? "")),
  get_news_feed: async () => getNewsFeed(),
  get_market_quotes: async (args) => {
    const symbols = Array.isArray(args.symbols) ? (args.symbols as string[]) : undefined;
    return symbols && symbols.length > 0
      ? getQuotesFor(symbols.map((s) => ({ symbol: s, label: s })))
      : getMarketQuotes();
  },
  get_watchlist: async () => getWatchlistForAgent(),
  get_calendar_events: async () => getCalendarEventsForAgent(),
  get_company_stats: async () => getCompanyStatsForAgent(),
};

export async function dispatchTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(args);
}

// Per-agent tool matrix — see the approved plan for the reasoning behind
// each assignment. Agents not listed here get no tools: their described
// role has no real backing data source in K.I.V. yet (ALE, social media,
// personal brand, documents, contracts), so v1 gives them none rather than
// fake ones.
export function getToolsForAgent(agentId: string): GeminiTool[] {
  switch (agentId) {
    case "atlas":
    case "meridian":
    case "cipher":
      return [{ functionDeclarations: [WEB_SEARCH_DECL, NEWS_FEED_DECL] }];
    case "oracle":
      return [{ functionDeclarations: [MARKET_QUOTES_DECL, WATCHLIST_DECL, NEWS_FEED_DECL] }];
    case "forge":
    case "blueprint":
    case "broadcast":
      return [{ functionDeclarations: [WEB_SEARCH_DECL] }];
    case "ledger":
      return [{ functionDeclarations: [COMPANY_STATS_DECL] }];
    case "ticker":
      return [{ functionDeclarations: [MARKET_QUOTES_DECL, WATCHLIST_DECL] }];
    case "chronicle":
      return [{ functionDeclarations: [CALENDAR_DECL, COMPANY_STATS_DECL] }];
    default:
      return [];
  }
}
