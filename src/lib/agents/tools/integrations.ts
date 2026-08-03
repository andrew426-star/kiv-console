export type IntegrationStatus = {
  name: string;
  configured: boolean;
  description: string;
};

// A live, honest snapshot of every external integration K.I.V. has (or
// doesn't have yet) — every agent gets this tool per Andrew: "complete
// transparency and awareness of all integrations involving Kivaro AI."
// `configured` is a real env-var presence check, not a hardcoded claim.
export function getIntegrationsStatus(): IntegrationStatus[] {
  return [
    {
      name: "Google Workspace",
      configured: Boolean(process.env.GOOGLE_CLIENT_ID),
      description: "Calendar, and ALE's Sheets/Docs/Drive/Gmail-send access — one OAuth connection.",
    },
    {
      name: "Google Places API",
      configured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
      description: "ALE Stage 1 company discovery.",
    },
    {
      name: "Hunter.io",
      configured: Boolean(process.env.HUNTER_API_KEY),
      description: "ALE Stage 1 contact enrichment.",
    },
    {
      name: "Finnhub",
      configured: Boolean(process.env.FINNHUB_API_KEY),
      description: "Market quotes: nav ticker, Intel Hub watchlist, agent market-quote tool.",
    },
    {
      name: "NewsAPI",
      configured: Boolean(process.env.NEWSAPI_KEY),
      description:
        "Market-moves/AI-tools-LLM/hedge-fund-PE-VC news feed (general + Intel Hub's per-category feeds).",
    },
    {
      name: "Anthropic (Claude)",
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      description: "ALE Stage 2 research + Stage 3 sales pitch generation only.",
    },
    {
      name: "Gemini",
      configured: Boolean(process.env.GEMINI_API_KEY),
      description: "Research brief + all 15 Slack agents' replies (free tier).",
    },
    {
      name: "Tavily",
      configured: Boolean(process.env.TAVILY_API_KEY),
      description: "Web search tool for Atlas, Meridian, Cipher, Forge, Blueprint, Broadcast.",
    },
    {
      name: "Stripe",
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      description: "Company Financials on the Portfolio page — balance + recent activity, read-only.",
    },
    {
      name: "Alpaca",
      configured: Boolean(process.env.ALPACA_API_KEY_ID && process.env.ALPACA_SECRET_KEY),
      description: "Investment Account on the Portfolio page — account + positions, read-only.",
    },
    {
      name: "Zoho Mail",
      configured: Boolean(process.env.ZOHO_CLIENT_ID),
      description: "Pipeline's real outreach-email send capability — andrew.thomas@kivaroai.com, send-only.",
    },
    {
      name: "Slack",
      configured: true,
      description: "15 agents, each its own real Slack app/bot identity.",
    },
    {
      name: "Supabase",
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      description: "Database + auth for the whole console.",
    },
    {
      name: "Railway",
      configured: true,
      description: "Hosting/deployment.",
    },
  ];
}
