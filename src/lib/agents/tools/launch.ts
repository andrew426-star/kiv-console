import { createAdminClient } from "@/lib/supabase/admin";
import { readLaunchSnapshot } from "@/lib/launch/queries";
import {
  ACTIVITY_KINDS,
  SEGMENT_LABELS,
  SEGMENTS,
  isActivityKind,
  isSegment,
  todayInLaunchZone,
} from "@/lib/launch/plan";

// Admin-scoped launch tracker access for the Slack agents — same query the
// /launch page runs under the user's session.
export async function getLaunchStatusForAgent() {
  const snapshot = await readLaunchSnapshot(await createAdminClient(), 10);
  if (!snapshot.ok) return { ok: false, error: snapshot.error };
  return {
    ok: true,
    ...snapshot.progress,
    conversationsBySegment: snapshot.conversationsBySegment,
    segmentLabels: SEGMENT_LABELS,
    recent: snapshot.recent,
  };
}

export async function logLaunchActivityForAgent(agentId: string, args: Record<string, unknown>) {
  const kind = args.kind;
  if (!isActivityKind(kind)) {
    return { ok: false, error: `kind must be one of: ${ACTIVITY_KINDS.join(", ")}` };
  }
  const segment = typeof args.segment === "string" && args.segment ? args.segment : null;
  if (segment !== null && !isSegment(segment)) {
    return { ok: false, error: `segment must be one of: ${SEGMENTS.join(", ")}` };
  }
  const text = (key: string) =>
    typeof args[key] === "string" && (args[key] as string).trim() ? (args[key] as string).trim() : null;
  const occurredOn = text("occurredOn");
  if (occurredOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
    return { ok: false, error: "occurredOn must be a YYYY-MM-DD date" };
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("launch_activity")
    .insert({
      kind,
      segment,
      company: text("company"),
      contact: text("contact"),
      notes: text("notes"),
      occurred_on: occurredOn ?? todayInLaunchZone(),
      logged_by: agentId,
    })
    .select("id, kind, company, occurred_on")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, logged: data };
}
