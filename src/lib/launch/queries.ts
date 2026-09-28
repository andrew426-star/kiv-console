import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  computeProgress,
  emptyCounts,
  isActivityKind,
  todayInLaunchZone,
  type ActivityKind,
  type LaunchProgress,
  type Segment,
} from "./plan";

export type LaunchActivity = {
  id: string;
  kind: ActivityKind;
  company: string | null;
  contact: string | null;
  segment: Segment | null;
  notes: string | null;
  occurredOn: string;
  loggedBy: string;
};

export type LaunchSnapshot =
  | { ok: true; progress: LaunchProgress; recent: LaunchActivity[]; conversationsBySegment: Partial<Record<Segment, number>> }
  | { ok: false; error: string };

type Row = {
  id: string;
  kind: string;
  company: string | null;
  contact: string | null;
  segment: string | null;
  notes: string | null;
  occurred_on: string;
  logged_by: string;
};

function toActivity(row: Row): LaunchActivity {
  return {
    id: row.id,
    kind: row.kind as ActivityKind,
    company: row.company,
    contact: row.contact,
    segment: row.segment as Segment | null,
    notes: row.notes,
    occurredOn: row.occurred_on,
    loggedBy: row.logged_by,
  };
}

// Takes the client so the page (user session, through RLS) and the agent
// tools (service role, no session) share one query.
export async function readLaunchSnapshot(
  supabase: Pick<SupabaseClient, "from">,
  recentLimit = 15,
): Promise<LaunchSnapshot> {
  const [all, recent] = await Promise.all([
    supabase.from("launch_activity").select("kind, segment"),
    supabase
      .from("launch_activity")
      .select("id, kind, company, contact, segment, notes, occurred_on, logged_by")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(recentLimit),
  ]);
  // Most likely cause: the launch_activity migration hasn't been applied.
  if (all.error) return { ok: false, error: all.error.message };
  if (recent.error) return { ok: false, error: recent.error.message };

  const counts = emptyCounts();
  const conversationsBySegment: Partial<Record<Segment, number>> = {};
  for (const row of all.data ?? []) {
    if (!isActivityKind(row.kind)) continue;
    counts[row.kind] += 1;
    if (row.kind === "conversation" && row.segment) {
      const segment = row.segment as Segment;
      conversationsBySegment[segment] = (conversationsBySegment[segment] ?? 0) + 1;
    }
  }

  return {
    ok: true,
    progress: computeProgress(todayInLaunchZone(), counts),
    recent: ((recent.data ?? []) as Row[]).map(toActivity),
    conversationsBySegment,
  };
}

export async function getLaunchSnapshot(): Promise<LaunchSnapshot> {
  return readLaunchSnapshot(await createClient());
}
