import { createAdminClient } from "@/lib/supabase/admin";
import { todayInCalendarZone } from "@/lib/calendar/organize";

// Open tasks from the Company Dashboard board, soonest first, with overdue
// flags — what Chronicle's pace checks and weekly reviews work from.
// get_company_stats only has counts; this has the actual items.
export async function getTasksDueForAgent(withinDays = 7) {
  const admin = await createAdminClient();
  const today = todayInCalendarZone();
  const [y, m, d] = today.split("-").map(Number);
  const horizon = new Date(Date.UTC(y, m - 1, d + withinDays)).toISOString().slice(0, 10);

  const [{ data: tasks, error }, { data: projects, error: projectsError }] = await Promise.all([
    admin
      .from("tasks")
      .select("title, status, due_date, project_id")
      .in("status", ["todo", "in_progress", "blocked"])
      .lte("due_date", horizon)
      .order("due_date", { ascending: true }),
    admin.from("projects").select("id, name"),
  ]);
  if (error) throw error;
  if (projectsError) throw projectsError;

  const projectName = new Map((projects ?? []).map((p) => [p.id as string, p.name as string]));
  const rows = (tasks ?? []).map((t) => ({
    title: t.title as string,
    status: t.status as string,
    dueDate: t.due_date as string,
    overdue: (t.due_date as string) < today,
    project: projectName.get(t.project_id as string) ?? null,
  }));

  return { today, withinDays, overdue: rows.filter((r) => r.overdue).length, tasks: rows };
}
