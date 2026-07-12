import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import { getMarketQuotes, getQuotesFor } from "@/lib/market/finnhub";
import { getNewsFeed } from "@/lib/news/newsapi";
import { getWatchlistForAgent } from "./tools/watchlist";
import { getCalendarEventsForAgent } from "./tools/calendar";
import { getCompanyStatsForAgent } from "./tools/company-stats";

// Claude's server-side web search — Anthropic executes this, no code here.
const WEB_SEARCH = { type: "web_search_20260209" as const, name: "web_search" as const };

const getNewsFeedTool = betaTool({
  name: "get_news_feed",
  description:
    "Get the latest curated Fintech / AI-automation / alternative-investment news headlines Kivaro tracks.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  run: async () => JSON.stringify(await getNewsFeed()),
});

const getMarketQuotesTool = betaTool({
  name: "get_market_quotes",
  description:
    "Get live price quotes. Pass specific ticker symbols, or omit to get Kivaro's default market snapshot (SPY, QQQ, AAPL, NVDA, BTC, ETH).",
  inputSchema: {
    type: "object",
    properties: {
      symbols: {
        type: "array",
        items: { type: "string" },
        description:
          'Ticker symbols to quote, e.g. ["AAPL", "BINANCE:BTCUSDT"]. Omit for the default snapshot.',
      },
    },
    additionalProperties: false,
  },
  run: async ({ symbols }) => {
    const quotes =
      symbols && symbols.length > 0
        ? await getQuotesFor(symbols.map((s) => ({ symbol: s, label: s })))
        : await getMarketQuotes();
    return JSON.stringify(quotes);
  },
});

const getWatchlistTool = betaTool({
  name: "get_watchlist",
  description: "Get Kivaro's tracked investment watchlist with live price quotes.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  run: async () => JSON.stringify(await getWatchlistForAgent()),
});

const getCalendarEventsTool = betaTool({
  name: "get_calendar_events",
  description: "Get Andrew's upcoming calendar events for the next 14 days.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  run: async () => JSON.stringify(await getCalendarEventsForAgent()),
});

const getCompanyStatsTool = betaTool({
  name: "get_company_stats",
  description:
    "Get Kivaro's current operational stats: active projects, total clients, and task counts by status. This is operational data, not a financial P&L — there is no finance ledger table yet.",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  run: async () => JSON.stringify(await getCompanyStatsForAgent()),
});

// Per-agent tool matrix — see the approved plan for the reasoning behind
// each assignment. Agents not listed here get no tools: their described
// role has no real backing data source in K.I.V. yet (ALE, social media,
// personal brand, documents, contracts), so v1 gives them none rather than
// fake ones.
export function getToolsForAgent(agentId: string) {
  switch (agentId) {
    case "atlas":
    case "meridian":
    case "cipher":
      return [WEB_SEARCH, getNewsFeedTool];
    case "oracle":
      return [getMarketQuotesTool, getWatchlistTool, getNewsFeedTool];
    case "forge":
    case "blueprint":
    case "broadcast":
      return [WEB_SEARCH];
    case "ledger":
      return [getCompanyStatsTool];
    case "ticker":
      return [getMarketQuotesTool, getWatchlistTool];
    case "chronicle":
      return [getCalendarEventsTool, getCompanyStatsTool];
    default:
      return [];
  }
}
