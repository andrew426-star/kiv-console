import { createClient } from "@/lib/supabase/server";

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type DeliverableStage = "backlog" | "in_progress" | "review" | "delivered";

export async function getTaskStats() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("status");
  if (error) throw error;

  const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, blocked: 0, done: 0 };
  for (const row of data ?? []) {
    counts[row.status as TaskStatus] += 1;
  }

  const [{ count: activeProjects }, { count: totalClients }] = await Promise.all([
    supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("clients").select("*", { count: "exact", head: true }),
  ]);

  return {
    counts,
    activeProjects: activeProjects ?? 0,
    totalClients: totalClients ?? 0,
  };
}

export async function getTeamBoard() {
  const supabase = await createClient();
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, role");
  if (profilesError) throw profilesError;

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("assignee_id, status");
  if (tasksError) throw tasksError;

  return (profiles ?? []).map((profile) => {
    const assigned = (tasks ?? []).filter((t) => t.assignee_id === profile.id);
    return {
      ...profile,
      active: assigned.filter((t) => t.status === "in_progress").length,
      blocked: assigned.filter((t) => t.status === "blocked").length,
      completed: assigned.filter((t) => t.status === "done").length,
    };
  });
}

export async function getProfiles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getClientPortalBoard() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deliverables")
    .select("id, title, stage, due_date, client_id, project_id, clients(name)")
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

// Confirmed clients only (active/paused/completed) — leads live in their
// own column on the Client Pipeline, not mixed in here.
export async function getClients() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, status, source, ale_doc_url, created_at")
    .neq("status", "lead")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getLeads() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, status, source, ale_doc_url, created_at")
    .eq("status", "lead")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, status, client_id, owner_id, clients(name), profiles(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, status, due_date, project_id, assignee_id, projects(name), profiles(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export type ProjectBoardSnapshot = {
  projects: Array<{ id: string; name: string; status: string; clientName: string | null }>;
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: string | null;
    projectName: string | null;
  }>;
};

// Raw project/task state for the Research brief — not archived/completed
// projects, and any task short of done, so the brief can flag what's
// blocked or due soon without re-deriving that from a full dump.
export async function getProjectBoardSnapshot(): Promise<ProjectBoardSnapshot> {
  const supabase = await createClient();
  const [{ data: projects, error: projectsError }, { data: tasks, error: tasksError }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, status, clients(name)")
        .in("status", ["planning", "active", "blocked"]),
      supabase
        .from("tasks")
        .select("id, title, status, due_date, projects(name)")
        .neq("status", "done"),
    ]);
  if (projectsError) throw projectsError;
  if (tasksError) throw tasksError;

  return {
    projects: (projects ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      status: p.status as string,
      clientName: (p.clients as unknown as { name: string } | null)?.name ?? null,
    })),
    tasks: (tasks ?? []).map((t) => ({
      id: t.id as string,
      title: t.title as string,
      status: t.status as TaskStatus,
      dueDate: t.due_date as string | null,
      projectName: (t.projects as unknown as { name: string } | null)?.name ?? null,
    })),
  };
}

export async function getFormOptions() {
  const supabase = await createClient();
  const [{ data: clients }, { data: projects }, { data: profiles }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("projects").select("id, name").order("name"),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);
  return {
    clients: clients ?? [],
    projects: projects ?? [],
    profiles: profiles ?? [],
  };
}
