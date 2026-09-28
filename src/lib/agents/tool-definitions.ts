import type { GeminiFunctionDeclaration, GeminiTool } from "@/lib/ai/gemini";
import { webSearch, WEB_SEARCH_DECL } from "@/lib/ai/web-search";
import { getNewsFeed } from "@/lib/news/newsapi";
import { getStripeFinancials } from "@/lib/portfolio/stripe";
import { getCalendarEventsForAgent } from "./tools/calendar";
import { getCompanyStatsForAgent } from "./tools/company-stats";
import { searchCompanyDriveForAgent } from "./tools/company-drive";
import { getIntegrationsStatus } from "./tools/integrations";
import { getPipelineStatusForAgent } from "./tools/pipeline";
import { generateShowcaseForAgent } from "./tools/showcase";
import { createGithubIssue } from "./tools/github";
import { getSearchConsoleStatsForAgent } from "./tools/search-console";
import { sendOutreachEmailForAgent, sendBulkOutreachEmailsForAgent } from "./tools/send-outreach-email";
import { getOutreachContactsForAgent } from "./tools/outreach-contacts";
import { getLaunchStatusForAgent, logLaunchActivityForAgent } from "./tools/launch";

const NEWS_FEED_DECL: GeminiFunctionDeclaration = {
  name: "get_news_feed",
  description:
    "Get the latest curated news headlines Kivaro tracks: potential market moves, AI tools/LLM updates, and shifts in hedge funds, private equity, venture capital, or the AI field.",
  parameters: { type: "OBJECT", properties: {} },
};

const CALENDAR_DECL: GeminiFunctionDeclaration = {
  name: "get_calendar_events",
  description: "Get Andrew's calendar for the next 14 days, already organized and in Central time: highlights (one-off events, exams, deadlines, sales calls, and classes at an unusual time), his weekly routine (repeating blocks like classes, one row each with days and time), and a day-by-day agenda.",
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
    "Send outreach emails to MULTIPLE companies in one operation — same real, irreversible send as send_outreach_email, looped per company with all the same guardrails (duplicate-send check, requires a drafted email and a real contact, most-senior-contact selection, and the shared hourly send-rate limit, which applies across ALL sends combined, single or bulk). Pass an explicit list of company names for a named batch, or omit companyNames entirely to target every company that currently has a drafted-but-unsent pitch and a real contact email on file. This handles rate limiting for you: it sends what the current hour allows, then QUEUES the rest, and a scheduled drip sends the queue a few per hour until it's empty — so a large batch completes over hours without anyone re-triggering it. Report the split honestly: `attempted` went out now, `queued` are scheduled and have NOT been sent yet, `skipped` were not queueable, and a `queueError` means those companies were neither sent nor scheduled. Never imply the whole batch went out.",
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

const OUTREACH_CONTACTS_DECL: GeminiFunctionDeclaration = {
  name: "get_outreach_contacts",
  description:
    "Read the actual contact list behind outreach, straight from the ALE Contacts spreadsheet: for each company, every contact on file with their name, job title, email, and where that title sits on the management ladder (seniorityRank 1 = most senior), plus which single contact an outreach email would actually go to (willReceiveOutreach), and whether that company's pitch is drafted, queued, or already sent. Use this to answer any question about who outreach targets, or to check seniority before sending. Read-only — it sends and queues nothing.",
  parameters: {
    type: "OBJECT",
    properties: {
      companyName: {
        type: "STRING",
        description:
          "Exact company name to drill into. Omit to list every company that has a pitch drafted.",
      },
    },
  },
};

const LAUNCH_STATUS_DECL: GeminiFunctionDeclaration = {
  name: "get_launch_status",
  description:
    "Get Kivaro AI's launch tracker: days until the January 2027 launch, the current phase (Discovery, Pilots, Commitments, Launch) with its goal and days left, real counts of logged conversations, pilots, commitments, publicity actions and content against each phase's target, conversations broken down by target segment, and the most recent logged activity. Counts only reflect what has actually been logged.",
  parameters: { type: "OBJECT", properties: {} },
};

const LOG_LAUNCH_ACTIVITY_DECL: GeminiFunctionDeclaration = {
  name: "log_launch_activity",
  description:
    "Record one real launch activity in the tracker: a conversation with a prospect, a pilot started, a paid commitment or letter of intent, a publicity action (competition entered, podcast, press, newsletter feature), or a piece of content published. Only log something Andrew has said actually happened. Never log a plan, a draft, or an idea.",
  parameters: {
    type: "OBJECT",
    properties: {
      kind: {
        type: "STRING",
        format: "enum",
        enum: ["conversation", "pilot", "commitment", "publicity", "content"],
      },
      company: { type: "STRING", description: "The firm or outlet involved, if any." },
      contact: { type: "STRING", description: "The person involved, with their title if known." },
      segment: {
        type: "STRING",
        format: "enum",
        enum: [
          "hedge_fund",
          "research_analytics",
          "investor_relations",
          "quant",
          "venture_capital",
          "private_equity",
        ],
        description: "Which target segment this belongs to, if it is about a prospect.",
      },
      notes: {
        type: "STRING",
        description: "What was said or learned: their pain points in their own words, next step, price discussed.",
      },
      occurredOn: {
        type: "STRING",
        description: "YYYY-MM-DD date it happened. Omit for today.",
      },
    },
    required: ["kind"],
  },
};

type ToolContext = { agentId: string };

// name -> handler, used by the agent loop (src/lib/agents/respond.ts) once
// Gemini requests a function call by name.
const HANDLERS: Record<
  string,
  (args: Record<string, unknown>, context: ToolContext) => Promise<unknown>
> = {
  web_search: async (args) => webSearch(String(args.query ?? "")),
  get_news_feed: async () => getNewsFeed(),
  get_calendar_events: async () => getCalendarEventsForAgent(),
  get_company_stats: async () => getCompanyStatsForAgent(),
  get_stripe_financials: async () => getStripeFinancials(),
  search_company_drive: async (args) => searchCompanyDriveForAgent(String(args.query ?? "")),
  get_integrations_status: async () => getIntegrationsStatus(),
  get_pipeline_status: async () => getPipelineStatusForAgent(),
  get_launch_status: async () => getLaunchStatusForAgent(),
  log_launch_activity: async (args, { agentId }) => logLaunchActivityForAgent(agentId, args),
  generate_showcase: async (args) => generateShowcaseForAgent(String(args.companyName ?? "")),
  create_github_issue: async (args) =>
    createGithubIssue(String(args.title ?? ""), String(args.body ?? "")),
  get_search_console_stats: async () => getSearchConsoleStatsForAgent(),
  send_outreach_email: async (args) => sendOutreachEmailForAgent(String(args.companyName ?? "")),
  get_outreach_contacts: async (args) =>
    getOutreachContactsForAgent(
      typeof args.companyName === "string" && args.companyName.trim()
        ? args.companyName
        : undefined,
    ),
  send_bulk_outreach_emails: async (args) => {
    const companyNames = Array.isArray(args.companyNames)
      ? (args.companyNames as unknown[]).map(String)
      : undefined;
    return sendBulkOutreachEmailsForAgent(companyNames);
  },
};

export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  context: ToolContext,
): Promise<unknown> {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`Unknown tool: ${name}`);
  return handler(args, context);
}

// Every agent gets integrations transparency per Andrew: "complete
// transparency and awareness of all integrations involving Kivaro AI" —
// and, for the run-up to the January 2027 launch, the launch tracker.
const BASE_TOOLS: GeminiFunctionDeclaration[] = [
  INTEGRATIONS_STATUS_DECL,
  PIPELINE_STATUS_DECL,
  LAUNCH_STATUS_DECL,
  LOG_LAUNCH_ACTIVITY_DECL,
];

// Per-agent tool matrix, on top of BASE_TOOLS, for the four launch agents
// in roster.ts.
export function getToolsForAgent(agentId: string): GeminiTool[] {
  const specific: GeminiFunctionDeclaration[] = (() => {
    switch (agentId) {
      case "atlas":
        return [WEB_SEARCH_DECL, NEWS_FEED_DECL];
      case "pipeline":
        return [
          OUTREACH_CONTACTS_DECL,
          SEND_OUTREACH_EMAIL_DECL,
          SEND_BULK_OUTREACH_EMAILS_DECL,
          GENERATE_SHOWCASE_DECL,
        ];
      case "pulse":
        return [WEB_SEARCH_DECL, SEARCH_CONSOLE_DECL];
      case "chronicle":
        return [
          CALENDAR_DECL,
          COMPANY_STATS_DECL,
          COMPANY_DRIVE_DECL,
          STRIPE_FINANCIALS_DECL,
          CREATE_GITHUB_ISSUE_DECL,
        ];
      default:
        return [];
    }
  })();

  return [{ functionDeclarations: [...BASE_TOOLS, ...specific] }];
}
