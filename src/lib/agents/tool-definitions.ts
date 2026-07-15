import type { GeminiFunctionDeclaration, GeminiTool } from "@/lib/ai/gemini";
import { webSearch, WEB_SEARCH_DECL } from "@/lib/ai/web-search";
import { getMarketQuotes, getQuotesFor } from "@/lib/market/finnhub";
import { getNewsFeed } from "@/lib/news/newsapi";
import { getStripeFinancials } from "@/lib/portfolio/stripe";
import { getAlpacaPortfolio } from "@/lib/portfolio/alpaca";
import { getWatchlistForAgent } from "./tools/watchlist";
import { getCalendarEventsForAgent } from "./tools/calendar";
import { getCompanyStatsForAgent } from "./tools/company-stats";
import { searchCompanyDriveForAgent } from "./tools/company-drive";
import { getIntegrationsStatus } from "./tools/integrations";
import { generateShowcaseForAgent } from "./tools/showcase";
import { createGithubIssue } from "./tools/github";

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

const STRIPE_FINANCIALS_DECL: GeminiFunctionDeclaration = {
  name: "get_stripe_financials",
  description:
    "Get Kivaro AI's live Stripe balance (available/pending) and recent account activity. Read-only — there is no capability to issue charges, refunds, or payouts.",
  parameters: { type: "OBJECT", properties: {} },
};

const ALPACA_PORTFOLIO_DECL: GeminiFunctionDeclaration = {
  name: "get_alpaca_portfolio",
  description:
    "Get Kivaro's investment account: equity, cash, buying power, and open positions with unrealized P/L. Read-only — there is no capability to place trades.",
  parameters: { type: "OBJECT", properties: {} },
};

const COMPANY_DRIVE_DECL: GeminiFunctionDeclaration = {
  name: "search_company_drive",
  description:
    "Search Kivaro's Google Drive (Docs, Sheets, and other files) by keyword. Read-only — returns matching file names and links, does not read file contents.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: { type: "STRING", description: "Keywords to search for." },
    },
    required: ["query"],
  },
};

const INTEGRATIONS_STATUS_DECL: GeminiFunctionDeclaration = {
  name: "get_integrations_status",
  description:
    "List every external integration/service Kivaro AI has, and whether each is actually configured right now. Use this for any question about what tools, data sources, AI models, or integrations Kivaro uses in-house.",
  parameters: { type: "OBJECT", properties: {} },
};

const GENERATE_SHOWCASE_DECL: GeminiFunctionDeclaration = {
  name: "generate_showcase",
  description:
    "Generate (or regenerate) a mock client showcase script — a presentation-ready, step-by-step walkthrough for a live sales call or audit — built from an existing ALE sales pitch's Demo Setup. Requires that company already have a sales pitch on file.",
  parameters: {
    type: "OBJECT",
    properties: {
      companyName: {
        type: "STRING",
        description: "The exact company name as it appears in the ALE Sales Pitch Log.",
      },
    },
    required: ["companyName"],
  },
};

const CREATE_GITHUB_ISSUE_DECL: GeminiFunctionDeclaration = {
  name: "create_github_issue",
  description:
    "Open a real GitHub issue in the kiv-console repo proposing a workflow, feature, fix, or client showcase build. This tracks the proposal as a real, actionable item for Andrew (or Claude, in a real dev session) to actually implement — it does not write or deploy any code itself.",
  parameters: {
    type: "OBJECT",
    properties: {
      title: { type: "STRING", description: "A short, clear issue title." },
      body: {
        type: "STRING",
        description: "The full proposal: what to build, why, and a rough plan.",
      },
    },
    required: ["title", "body"],
  },
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
  get_stripe_financials: async () => getStripeFinancials(),
  get_alpaca_portfolio: async () => getAlpacaPortfolio(),
  search_company_drive: async (args) => searchCompanyDriveForAgent(String(args.query ?? "")),
  get_integrations_status: async () => getIntegrationsStatus(),
  generate_showcase: async (args) => generateShowcaseForAgent(String(args.companyName ?? "")),
  create_github_issue: async (args) =>
    createGithubIssue(String(args.title ?? ""), String(args.body ?? "")),
};

export async function dispatchTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(args);
}

// Every agent gets integrations transparency per Andrew: "complete
// transparency and awareness of all integrations involving Kivaro AI."
const BASE_TOOLS: GeminiFunctionDeclaration[] = [INTEGRATIONS_STATUS_DECL];

// Per-agent tool matrix, on top of BASE_TOOLS — see the approved plan for
// the reasoning behind each assignment. Agents not listed here get no
// extra tools: their described role has no real backing data source in
// K.I.V. yet (social media, personal brand, contracts, code/infra
// execution), so v1 gives them none rather than fake ones.
export function getToolsForAgent(agentId: string): GeminiTool[] {
  const specific: GeminiFunctionDeclaration[] = (() => {
    switch (agentId) {
      case "atlas":
      case "meridian":
      case "cipher":
        return [WEB_SEARCH_DECL, NEWS_FEED_DECL];
      case "oracle":
        return [
          MARKET_QUOTES_DECL,
          WATCHLIST_DECL,
          NEWS_FEED_DECL,
          STRIPE_FINANCIALS_DECL,
          ALPACA_PORTFOLIO_DECL,
        ];
      case "blueprint":
        return [WEB_SEARCH_DECL, GENERATE_SHOWCASE_DECL];
      case "forge":
        return [WEB_SEARCH_DECL, CREATE_GITHUB_ISSUE_DECL];
      case "broadcast":
        return [WEB_SEARCH_DECL];
      case "ledger":
        return [COMPANY_STATS_DECL, STRIPE_FINANCIALS_DECL];
      case "ticker":
        return [MARKET_QUOTES_DECL, WATCHLIST_DECL, ALPACA_PORTFOLIO_DECL];
      case "chronicle":
        return [CALENDAR_DECL, COMPANY_STATS_DECL, COMPANY_DRIVE_DECL];
      case "nexus":
      case "accord":
        return [COMPANY_DRIVE_DECL];
      default:
        return [];
    }
  })();

  return [{ functionDeclarations: [...BASE_TOOLS, ...specific] }];
}
