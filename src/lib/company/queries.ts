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

export async function getClients() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, status, created_at")
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
