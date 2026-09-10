import { createAdminClient } from "@/lib/supabase/admin";
import type { TaskStatus } from "@/lib/company/queries";

export type CompanyStatsForAgent = {
  counts: Record<TaskStatus, number>;
  activeProjects: number;
  totalClients: number;
};

// Admin-scoped mirror of getTaskStats() (src/lib/company/queries.ts) — same
// reasoning as the watchlist/calendar variants in this directory.
export async function getCompanyStatsForAgent(): Promise<CompanyStatsForAgent> {
  const admin = await createAdminClient();
  const { data, error } = await admin.from("tasks").select("status");
  if (error) throw error;

  const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
  for (const row of data ?? []) {
    counts[row.status as TaskStatus] += 1;
  }

  const [{ count: activeProjects }, { count: totalClients }] = await Promise.all([
    admin.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("clients").select("*", { count: "exact", head: true }),
  ]);

  return {
    counts,
    activeProjects: activeProjects ?? 0,
    totalClients: totalClients ?? 0,
  };
}
