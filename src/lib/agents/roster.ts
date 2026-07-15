// Reference roster for the Kivaro AI sovereign agent team — mirrored from
// kivaroai.com/agents (src/components/features/AgentTeamSection.tsx in the
// KivaroAI marketing site repo). Each agent is backed by a real, distinct
// Slack app (see src/lib/slack/credentials.ts) and Google's Gemini API
// (free tier — see src/lib/ai/gemini.ts). Every agent runs the same model;
// the earlier per-division Claude tiering was dropped when this moved off
// Claude, in favor of one flat model for everything.

export type AgentModel = "gemini-3.1-flash-lite";

export type Agent = {
  id: string;
  name: string;
  role: string;
  description: string;
  model: AgentModel;
};

export type Division = {
  id: string;
  label: string;
  color: string;
  agents: Agent[];
};

export function findAgent(agentId: string): { agent: Agent; division: Division } | null {
  for (const division of DIVISIONS) {
    const agent = division.agents.find((a) => a.id === agentId);
    if (agent) return { agent, division };
  }
  return null;
}

export const DIVISIONS: Division[] = [
  {
    id: "RNI",
    label: "Research & Intelligence",
    color: "hsl(199,89%,60%)",
    agents: [
      {
        id: "atlas",
        name: "Atlas",
        role: "AI Landscape Monitor",
        description:
          "Tracks emerging AI tools, models, and competitor moves to surface opportunities for Kivaro's roadmap and clients.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "meridian",
        name: "Meridian",
        role: "Fintech & Alts Analyst",
        description:
          "Delivers institutional-grade analysis on hedge funds, private equity, family offices, and alternative asset classes.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "oracle",
        name: "Oracle",
        role: "Markets & Crypto Intel",
        description:
          "Monitors price action, on-chain data, macro signals, and crypto narrative cycles across equities and digital assets.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "cipher",
        name: "Cipher",
        role: "Central Banking & Macro",
        description:
          "Decodes Fed policy, yield curves, inflation regimes, and monetary flows with second-order analysis for fund clients.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
  {
    id: "ADW",
    label: "Automation & Dev Workshop",
    color: "hsl(152,76%,46%)",
    agents: [
      {
        id: "forge",
        name: "Forge",
        role: "AI Integration Engineer",
        description:
          "Architects and builds AI-powered integrations, automations, and pipelines across Python, Node.js, and custom APIs.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "blueprint",
        name: "Blueprint",
        role: "Demo Build Planner",
        description:
          "Designs compelling AI demos for prospect meetings — translating client pain points into live, credible showcases.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "pipeline",
        name: "Pipeline",
        role: "Lead Engine Manager",
        description:
          "Oversees the Autonomous Lead Engine — monitoring lead quality, enrichment results, and pipeline velocity.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "pulse",
        name: "Pulse",
        role: "Social Media Automation",
        description:
          "Manages content scheduling, engagement tracking, and growth strategies across LinkedIn and X.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
  {
    id: "FPA",
    label: "Finance & Portfolio Analytics",
    color: "hsl(45,90%,55%)",
    agents: [
      {
        id: "ledger",
        name: "Ledger",
        role: "Company Finance Tracker",
        description:
          "Monitors P&L, cash flow, revenue, expenses, and runway — providing CFO-level clarity for a founder-led operation.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "ticker",
        name: "Ticker",
        role: "Investment & Price Action",
        description:
          "Tracks the investment portfolio across equities, crypto, and alternatives with entry/exit analysis and position sizing.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
  {
    id: "CBM",
    label: "Content & Brand Management",
    color: "hsl(262,72%,65%)",
    agents: [
      {
        id: "broadcast",
        name: "Broadcast",
        role: "Brand & Advertising",
        description:
          "Manages Kivaro AI's brand presence, ad campaigns, and marketing positioning with a bold, technical voice.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "canvas",
        name: "Canvas",
        role: "Personal Brand Manager",
        description:
          "Builds thought leadership for Andrew Thomas — positioning him as a leading AI founder across LinkedIn and beyond.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
  {
    id: "BPT",
    label: "Business Processes & Taxonomy",
    color: "hsl(170,70%,48%)",
    agents: [
      {
        id: "nexus",
        name: "Nexus",
        role: "Document Organization",
        description:
          "Manages the company knowledge base, file taxonomy, and document workflows — nothing gets lost, everything is findable.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "accord",
        name: "Accord",
        role: "Contract Management",
        description:
          "Tracks contracts, SOWs, and NDAs — flagging renewals, missing signatures, and key terms before they become risks.",
        model: "gemini-3.1-flash-lite",
      },
      {
        id: "chronicle",
        name: "Chronicle",
        role: "Scheduling & Reporting",
        description:
          "Manages calendar, meeting prep, and weekly reporting — eliminating scheduling friction and accountability gaps.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
];
