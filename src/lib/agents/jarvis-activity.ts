import { createClient } from "@/lib/supabase/server";
import type { ActivityEntry, ActivityStatus } from "./activity";

export async function getJarvisActivity(): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_activity_log")
    .select("id, agent_id, action, detail, status, created_at")
    .eq("agent_id", "jarvis")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Failed to load Jarvis activity log", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    agentId: row.agent_id as string,
    action: row.action as string,
    detail: row.detail as string | null,
    status: row.status as ActivityStatus,
    createdAt: row.created_at as string,
  }));
}
