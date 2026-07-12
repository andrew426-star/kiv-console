import { createClient } from "@/lib/supabase/server";

export type ActivityStatus = "info" | "success" | "warning" | "error";

export type ActivityEntry = {
  id: string;
  agentId: string;
  action: string;
  detail: string | null;
  status: ActivityStatus;
  createdAt: string;
};

export type ActivitySnapshot = {
  recent: ActivityEntry[];
  lastActiveByAgent: Map<string, ActivityEntry>;
};

export async function getActivitySnapshot(): Promise<ActivitySnapshot> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agent_activity_log")
    .select("id, agent_id, action, detail, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to load agent activity log", error);
    return { recent: [], lastActiveByAgent: new Map() };
  }

  const entries: ActivityEntry[] = (data ?? []).map((row) => ({
    id: row.id as string,
    agentId: row.agent_id as string,
    action: row.action as string,
    detail: row.detail as string | null,
    status: row.status as ActivityStatus,
    createdAt: row.created_at as string,
  }));

  const lastActiveByAgent = new Map<string, ActivityEntry>();
  for (const entry of entries) {
    if (!lastActiveByAgent.has(entry.agentId)) lastActiveByAgent.set(entry.agentId, entry);
  }

  return { recent: entries.slice(0, 20), lastActiveByAgent };
}
