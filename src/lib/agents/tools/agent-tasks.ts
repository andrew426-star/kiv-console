import { createAdminClient } from "@/lib/supabase/admin";
import { todayInCalendarZone } from "@/lib/calendar/organize";
import { effectiveDelegation, type Delegation } from "../delegation";

// The Company Dashboard work Andrew has delegated to an agent — by the
// task itself or by its project (see src/lib/agents/delegation.ts) — and
// the one write an agent may make to it: its status and a progress report.

export type DelegatedTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  overdue: boolean;
  project: string | null;
  projectDescription: string | null;
  delegation: Delegation;
  lastReport: string | null;
  lastReportedAt: string | null;
};

const TASK_COLUMNS =
  "id, title, description, status, due_date, agent_report, agent_reported_at, delegate_agent_id, delegate_actions, delegation_notes, projects(name, description, status, delegate_agent_id, delegate_actions, delegation_notes)";

type ProjectRow = {
  name: string;
  description: string | null;
  status: string;
  delegate_agent_id: string | null;
  delegate_actions: string[] | null;
  delegation_notes: string | null;
};

// Finished projects' delegations lapse with them.
const CLOSED_PROJECT_STATUSES = new Set(["completed", "archived"]);

export async function getDelegatedTasks(agentId: string): Promise<DelegatedTask[]> {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .select(TASK_COLUMNS)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;

  const today = todayInCalendarZone();
  const tasks: DelegatedTask[] = [];
  for (const row of data ?? []) {
    const project = row.projects as unknown as ProjectRow | null;
    if (project && CLOSED_PROJECT_STATUSES.has(project.status)) continue;
    const delegation = effectiveDelegation(row, project);
    if (delegation?.agentId !== agentId) continue;
    const dueDate = row.due_date as string | null;
    tasks.push({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) || null,
      status: row.status as string,
      dueDate,
      overdue: !!dueDate && dueDate < today,
      project: project?.name ?? null,
      projectDescription: project?.description || null,
      delegation,
      lastReport: row.agent_report as string | null,
      lastReportedAt: row.agent_reported_at as string | null,
    });
  }
  return tasks;
}

export async function getMyTasksForAgent(agentId: string) {
  const tasks = await getDelegatedTasks(agentId);
  return { count: tasks.length, tasks };
}

const AGENT_SETTABLE_STATUSES = ["todo", "in_progress", "blocked", "done"] as const;

export async function updateMyTaskForAgent(agentId: string, args: Record<string, unknown>) {
  const taskId = typeof args.taskId === "string" ? args.taskId : "";
  const status = args.status;
  const report = typeof args.report === "string" ? args.report.trim() : "";
  if (!report) return { ok: false, error: "report is required: say what you did and what's next" };
  if (status !== undefined && !(AGENT_SETTABLE_STATUSES as readonly unknown[]).includes(status)) {
    return { ok: false, error: `status must be one of: ${AGENT_SETTABLE_STATUSES.join(", ")}` };
  }

  // Only work actually delegated to this agent, so a task id from anywhere
  // else (another agent's, Andrew's own) can't be touched.
  const mine = await getDelegatedTasks(agentId);
  const task = mine.find((t) => t.id === taskId);
  if (!task) return { ok: false, error: "That task is not delegated to you, or it is already done" };

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("tasks")
    .update({
      ...(status ? { status } : {}),
      agent_report: report,
      agent_reported_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .select("id, title, status")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, task: data };
}
