// Roster for the Kivaro AI agent team — originally mirrored from
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

// Cut from 15 agents to 4 on 2026-09-28 to focus on the January 2027
// launch. The 4 kept their ids, names and Slack apps; only their roles
// changed. The 11 retired agents (meridian, oracle, cipher, forge,
// blueprint, ledger, ticker, broadcast, canvas, nexus, accord) are out of
// the roster, so their Slack event URLs now 404. The kivaroai.com/agents
// page still shows all 15 until the marketing site is updated.
export const DIVISIONS: Division[] = [
  {
    id: "RNI",
    label: "Market Intelligence",
    color: "hsl(199,89%,60%)",
    agents: [
      {
        id: "atlas",
        name: "Atlas",
        role: "Fund Market Scout",
        description:
          "Researches the target segments (hedge funds, research, IR, quant, VC, PE), their pain points and competitors, and finds publicity openings: pitch competitions, podcasts, newsletters, press.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
  {
    id: "SLS",
    label: "Sales & Outreach",
    color: "hsl(152,76%,46%)",
    agents: [
      {
        id: "pipeline",
        name: "Pipeline",
        role: "Closer",
        description:
          "Runs outreach on top of the Autonomous Lead Engine: prospects, sends, follow-ups and demo scripts, and moves conversations toward pilots and paid commitments.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
  {
    id: "CBM",
    label: "Content & Brand",
    color: "hsl(262,72%,65%)",
    agents: [
      {
        id: "pulse",
        name: "Pulse",
        role: "Content Voice",
        description:
          "Plans and drafts one content calendar across LinkedIn, X and Instagram for Kivaro AI and Andrew, written for a fund-industry audience and built around the launch.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
  {
    id: "OPS",
    label: "Launch Operations",
    color: "hsl(170,70%,48%)",
    agents: [
      {
        id: "chronicle",
        name: "Chronicle",
        role: "Launch Chief of Staff",
        description:
          "Keeps the launch plan on schedule: phase targets, weekly reviews, calendar and class-load planning, admin and legal checklists, and finances.",
        model: "gemini-3.1-flash-lite",
      },
    ],
  },
];
