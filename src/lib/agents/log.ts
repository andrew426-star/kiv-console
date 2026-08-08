import { createAdminClient } from "@/lib/supabase/admin";
import { findAgent } from "./roster";

export const VALID_STATUSES = ["info", "success", "warning", "error"] as const;
export type LogStatus = (typeof VALID_STATUSES)[number];

// Non-roster ids allowed to write to agent_activity_log, for external
// services with their own dedicated K.I.V. page but no public roster entry.
// See src/app/(dashboard)/jarvis/page.tsx.
const EXTRA_LOGGABLE_AGENT_IDS = new Set(["jarvis", "trading-engine"]);

export function isLoggableAgentId(agentId: string): boolean {
  return !!findAgent(agentId) || EXTRA_LOGGABLE_AGENT_IDS.has(agentId);
}

export type LogAgentActivityInput = {
  agentId: string;
  action: string;
  detail?: string | null;
  status?: LogStatus;
};

// Shared by the external-facing POST /api/agents/log route (bearer-token
// auth, for other services) and the in-process Slack event handler (which
// already runs server-side and can skip the HTTP round-trip to itself).
export async function logAgentActivity({ agentId, action, detail, status }: LogAgentActivityInput) {
  if (!isLoggableAgentId(agentId)) {
    throw new Error(`Unknown agentId: ${agentId}`);
  }
  if (!action || action.trim().length === 0) {
    throw new Error("action is required");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_activity_log")
    .insert({
      agent_id: agentId,
      action: action.trim(),
      detail: detail ?? null,
      status: status ?? "info",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
