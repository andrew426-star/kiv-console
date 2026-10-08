// Work delegation: Andrew hands a project or task to one of the four
// launch agents, and the delegation doubles as his approval for what that
// agent may do on it unattended. Shared by the board's forms (client) and
// the autonomous runs (src/lib/agents/autonomy.ts), so it stays free of
// server-only imports.
//
// Every delegated agent may always research, draft, and report progress
// on its delegated tasks (update_my_task). The acting tools below are
// extra, and an autonomous run only gets the ones Andrew ticked on at
// least one of that agent's open delegated tasks. Bulk sends and launch
// logging are never delegable: bulk sends queue without limit, and
// launch activity is only ever what Andrew says actually happened.

export const DELEGATE_AGENT_IDS = ["atlas", "pipeline", "pulse", "chronicle"] as const;
export type DelegateAgentId = (typeof DELEGATE_AGENT_IDS)[number];

export const DELEGATE_AGENT_NAMES: Record<DelegateAgentId, string> = {
  atlas: "Atlas",
  pipeline: "Pipeline",
  pulse: "Pulse",
  chronicle: "Chronicle",
};

// The most outreach emails Pipeline may send on its own in one Central
// calendar day, counting every send that day (manual, drip, autonomous).
export const AUTONOMOUS_DAILY_SEND_CAP = 10;

export type DelegableAction = { tool: string; label: string };

export const DELEGABLE_ACTIONS: Record<DelegateAgentId, DelegableAction[]> = {
  atlas: [],
  pulse: [],
  pipeline: [
    {
      tool: "send_outreach_email",
      label: `Send already-drafted outreach emails (up to ${AUTONOMOUS_DAILY_SEND_CAP}/day)`,
    },
    { tool: "generate_showcase", label: "Generate client showcase scripts" },
  ],
  chronicle: [{ tool: "create_github_issue", label: "Open GitHub issues in kiv-console" }],
};

export function isDelegateAgentId(value: unknown): value is DelegateAgentId {
  return typeof value === "string" && (DELEGATE_AGENT_IDS as readonly string[]).includes(value);
}

// Drops anything the agent can't be approved for, so a stale form or a
// changed roster can never widen what an agent may do.
export function sanitizeDelegateActions(agentId: string | null, actions: string[]): string[] {
  if (!isDelegateAgentId(agentId)) return [];
  const allowed = new Set(DELEGABLE_ACTIONS[agentId].map((a) => a.tool));
  return [...new Set(actions.filter((a) => allowed.has(a)))];
}

export type Delegation = {
  agentId: DelegateAgentId;
  actions: string[];
  notes: string | null;
  // Where it came from, so the agent and the board can say so.
  source: "task" | "project";
};

type DelegationColumns = {
  delegate_agent_id: string | null;
  delegate_actions: string[] | null;
  delegation_notes: string | null;
};

// A task's own delegation wins; otherwise it inherits its project's.
export function effectiveDelegation(
  task: DelegationColumns,
  project: DelegationColumns | null,
): Delegation | null {
  for (const [row, source] of [
    [task, "task"],
    [project, "project"],
  ] as const) {
    if (row && isDelegateAgentId(row.delegate_agent_id)) {
      return {
        agentId: row.delegate_agent_id,
        actions: sanitizeDelegateActions(row.delegate_agent_id, row.delegate_actions ?? []),
        notes: row.delegation_notes?.trim() || null,
        source,
      };
    }
  }
  return null;
}
