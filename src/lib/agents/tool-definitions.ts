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
import { getPipelineStatusForAgent } from "./tools/pipeline";
import { generateShowcaseForAgent } from "./tools/showcase";
import { createGithubIssue } from "./tools/github";
import { getSearchConsoleStatsForAgent } from "./tools/search-console";
import { sendOutreachEmailForAgent, sendBulkOutreachEmailsForAgent } from "./tools/send-outreach-email";
import {
  getMarketMoversForAgent,
  getMarketSentimentReportForAgent,
  getAssetHistoryForAgent,
} from "./tools/market-movers";

const NEWS_FEED_DECL: GeminiFunctionDeclaration = {
  name: "get_news_feed",
  description:
    "Get the latest curated news headlines Kivaro tracks: potential market moves, AI tools/LLM updates, and shifts in hedge funds, private equity, venture capital, or the AI field.",
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

const MARKET_MOVERS_DECL: GeminiFunctionDeclaration = {
  name: "get_market_movers",
  description:
    "Get the biggest gainers and losers across a broad, real, curated universe of Stocks, Crypto, Metals, and Futures over a period — not limited to Kivaro's watchlist. Default period is the last 7 days. Metals and Futures have no raw spot/contract price feed available on this account's data plan; they're represented by real, heavily-traded tracking ETFs (e.g. GLD for gold, USO for crude oil) — every one of those labels ends in '(... ETF proxy)'. Never present an ETF-proxy result as a literal spot or futures-contract price — always call it out as a proxy when discussing Metals or Futures.",
  parameters: {
    type: "OBJECT",
    properties: {
      periodDays: { type: "NUMBER", description: "Lookback window in days. Default 7 (one week)." },
      assetClasses: {
        type: "ARRAY",
        items: { type: "STRING", format: "enum", enum: ["stocks", "crypto", "metals", "futures"] },
        description: "Which asset classes to include. Omit for all four.",
      },
      limit: { type: "NUMBER", description: "How many top gainers and top losers to return. Default 10." },
    },
  },
};

const MARKET_SENTIMENT_DECL: GeminiFunctionDeclaration = {
  name: "get_market_sentiment_report",
  description:
    "Get a real market-sentiment snapshot for the last 7 days across the same Stocks/Crypto/Metals/Futures universe as get_market_movers: breadth (how many tracked assets are up vs. down, and the average move), the current top gainers/losers, and recent real market-moving news headlines. This returns real underlying data only, never a pre-written sentiment verdict — read the breadth/headlines yourself and write the actual sentiment summary in your own reply.",
  parameters: { type: "OBJECT", properties: {} },
};

const ASSET_HISTORY_DECL: GeminiFunctionDeclaration = {
  name: "get_asset_price_history",
  description:
    "Get real recent daily closing prices for one specific symbol (a stock/ETF ticker like 'AAPL', or a crypto pair like 'BTC/USD'), to ground any commentary or entry/exit read on that specific asset in real recent price action rather than a guess.",
  parameters: {
    type: "OBJECT",
    properties: {
      symbol: { type: "STRING", description: "Ticker symbol, e.g. 'AAPL' or 'BTC/USD'." },
      assetClass: {
        type: "STRING",
        format: "enum",
        enum: ["stocks", "crypto", "metals", "futures"],
        description: "Optional — inferred from the symbol format if omitted (a '/' in the symbol implies crypto).",
      },
      days: { type: "NUMBER", description: "Lookback window in days. Default 14." },
    },
    required: ["symbol"],
  },
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

const PIPELINE_STATUS_DECL: GeminiFunctionDeclaration = {
  name: "get_pipeline_status",
  description:
    "Get Kivaro's current prospect and client listings — which companies are at what stage in the outreach process. Covers the Autonomous Lead Engine's automated pipeline (discovered, researched, pitch_created, or pitched) and existing clients with their status (active, paused, completed). pitch_created means an outreach draft exists but has NOT been sent; pitched means the email was actually sent and confirmed — never treat these as interchangeable.",
  parameters: { type: "OBJECT", properties: {} },
};

const SEARCH_CONSOLE_DECL: GeminiFunctionDeclaration = {
  name: "get_search_console_stats",
  description:
    "Get kivaroai.com's real Google Search Console performance over the last ~28 days: top search queries and top pages by clicks, impressions, and average position. Read-only.",
  parameters: { type: "OBJECT", properties: {} },
};

const SEND_OUTREACH_EMAIL_DECL: GeminiFunctionDeclaration = {
  name: "send_outreach_email",
  description:
    "Send the already-drafted Outreach Email for a company in the ALE Sales Pitch Log, verbatim, to that company's curated contact email, signed 'Andrew Thomas, Kivaro AI'. This is REAL — a real email leaves andrew.thomas@kivaroai.com and reaches a real person, irreversibly. Only works for a company with both a drafted Outreach Email and a real contact email already on file. Refuses (rather than resending) if this company was already sent to. On a successful send, a real follow-up-call reminder is automatically created on Andrew's Google Calendar two business days out, with the company's website, phone number, and the sent pitch in the event description.",
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

const SEND_BULK_OUTREACH_EMAILS_DECL: GeminiFunctionDeclaration = {
  name: "send_bulk_outreach_emails",
  description:
    "Send outreach emails to MULTIPLE companies in one operation — same real, irreversible send as send_outreach_email, looped per company with all the same guardrails (duplicate-send check, requires a drafted email and a real contact, and the shared hourly send-rate limit, which applies across ALL sends combined, single or bulk). Pass an explicit list of company names for a named batch, or omit companyNames entirely to target every company that currently has a drafted-but-unsent pitch and a real contact email on file. Once the hourly limit is hit mid-batch, remaining companies are reported as not attempted rather than being skipped silently — report that back plainly, don't imply the whole batch went out.",
  parameters: {
    type: "OBJECT",
    properties: {
      companyNames: {
        type: "ARRAY",
        items: { type: "STRING" },
        description:
          "Exact company names as they appear in the ALE Sales Pitch Log. Omit (or pass an empty array) to send to every eligible drafted-but-unsent company instead of naming them individually.",
      },
    },
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
  get_market_movers: async (args) =>
    getMarketMoversForAgent({
      periodDays: typeof args.periodDays === "number" ? args.periodDays : undefined,
      assetClasses: args.assetClasses,
      limit: typeof args.limit === "number" ? args.limit : undefined,
    }),
  get_market_sentiment_report: async () => getMarketSentimentReportForAgent(),
  get_asset_price_history: async (args) =>
    getAssetHistoryForAgent({
      symbol: String(args.symbol ?? ""),
      assetClass: typeof args.assetClass === "string" ? args.assetClass : undefined,
      days: typeof args.days === "number" ? args.days : undefined,
    }),
  search_company_drive: async (args) => searchCompanyDriveForAgent(String(args.query ?? "")),
  get_integrations_status: async () => getIntegrationsStatus(),
  get_pipeline_status: async () => getPipelineStatusForAgent(),
  generate_showcase: async (args) => generateShowcaseForAgent(String(args.companyName ?? "")),
  create_github_issue: async (args) =>
    createGithubIssue(String(args.title ?? ""), String(args.body ?? "")),
  get_search_console_stats: async () => getSearchConsoleStatsForAgent(),
  send_outreach_email: async (args) => sendOutreachEmailForAgent(String(args.companyName ?? "")),
  send_bulk_outreach_emails: async (args) => {
    const companyNames = Array.isArray(args.companyNames)
      ? (args.companyNames as unknown[]).map(String)
      : undefined;
    return sendBulkOutreachEmailsForAgent(companyNames);
  },
};

export async function dispatchTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(args);
}

// Every agent gets integrations transparency per Andrew: "complete
// transparency and awareness of all integrations involving Kivaro AI."
const BASE_TOOLS: GeminiFunctionDeclaration[] = [INTEGRATIONS_STATUS_DECL, PIPELINE_STATUS_DECL];

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
        return [
          MARKET_QUOTES_DECL,
          WATCHLIST_DECL,
          ALPACA_PORTFOLIO_DECL,
          MARKET_MOVERS_DECL,
          MARKET_SENTIMENT_DECL,
          ASSET_HISTORY_DECL,
        ];
      case "chronicle":
        return [CALENDAR_DECL, COMPANY_STATS_DECL, COMPANY_DRIVE_DECL];
      case "nexus":
      case "accord":
        return [COMPANY_DRIVE_DECL];
      case "canvas":
        return [SEARCH_CONSOLE_DECL];
      case "pipeline":
        return [SEND_OUTREACH_EMAIL_DECL, SEND_BULK_OUTREACH_EMAILS_DECL];
      default:
        return [];
    }
  })();

  return [{ functionDeclarations: [...BASE_TOOLS, ...specific] }];
}
