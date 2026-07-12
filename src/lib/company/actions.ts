"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DeliverableStage } from "./queries";

const ROLES = ["owner", "admin", "contractor", "viewer"] as const;
const STAGE_ORDER: DeliverableStage[] = ["backlog", "in_progress", "review", "delivered"];

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function updateRole(profileId: string, role: string) {
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    throw new Error(`Invalid role: ${role}`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", profileId);
  if (error) throw error;
  revalidatePath("/company");
}

export async function advanceDeliverableStage(
  deliverableId: string,
  currentStage: DeliverableStage,
) {
  const nextStage = STAGE_ORDER[STAGE_ORDER.indexOf(currentStage) + 1];
  if (!nextStage) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverables")
    .update({ stage: nextStage })
    .eq("id", deliverableId);
  if (error) throw error;
  revalidatePath("/company");
}

// --- Clients ---------------------------------------------------------------

export async function createClientRecord(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    name: str(formData, "name"),
    status: str(formData, "status") ?? "prospect",
  });
  if (error) throw error;
  revalidatePath("/company");
}

export async function updateClientRecord(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ name: str(formData, "name"), status: str(formData, "status") ?? "prospect" })
    .eq("id", clientId);
  if (error) throw error;
  revalidatePath("/company");
}

export async function deleteClientRecord(clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) throw error;
  revalidatePath("/company");
}

// --- Projects ----------------------------------------------------------------

export async function createProjectRecord(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").insert({
    name: str(formData, "name"),
    status: str(formData, "status") ?? "planning",
    client_id: str(formData, "client_id"),
    owner_id: str(formData, "owner_id"),
  });
  if (error) throw error;
  revalidatePath("/company");
}

export async function updateProjectRecord(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("projects")
    .update({
      name: str(formData, "name"),
      status: str(formData, "status") ?? "planning",
      client_id: str(formData, "client_id"),
      owner_id: str(formData, "owner_id"),
    })
    .eq("id", projectId);
  if (error) throw error;
  revalidatePath("/company");
}

export async function deleteProjectRecord(projectId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw error;
  revalidatePath("/company");
}

// --- Tasks -------------------------------------------------------------------

export async function createTaskRecord(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title: str(formData, "title"),
    status: str(formData, "status") ?? "todo",
    project_id: str(formData, "project_id"),
    assignee_id: str(formData, "assignee_id"),
    due_date: str(formData, "due_date"),
  });
  if (error) throw error;
  revalidatePath("/company");
}

export async function updateTaskRecord(taskId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: str(formData, "title"),
      status: str(formData, "status") ?? "todo",
      project_id: str(formData, "project_id"),
      assignee_id: str(formData, "assignee_id"),
      due_date: str(formData, "due_date"),
    })
    .eq("id", taskId);
  if (error) throw error;
  revalidatePath("/company");
}

export async function deleteTaskRecord(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
  revalidatePath("/company");
}

// --- Deliverables --------------------------------------------------------------

export async function createDeliverableRecord(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("deliverables").insert({
    title: str(formData, "title"),
    stage: str(formData, "stage") ?? "backlog",
    client_id: str(formData, "client_id"),
    project_id: str(formData, "project_id"),
    due_date: str(formData, "due_date"),
  });
  if (error) throw error;
  revalidatePath("/company");
}

export async function updateDeliverableRecord(deliverableId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("deliverables")
    .update({
      title: str(formData, "title"),
      stage: str(formData, "stage") ?? "backlog",
      client_id: str(formData, "client_id"),
      project_id: str(formData, "project_id"),
      due_date: str(formData, "due_date"),
    })
    .eq("id", deliverableId);
  if (error) throw error;
  revalidatePath("/company");
}

export async function deleteDeliverableRecord(deliverableId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("deliverables").delete().eq("id", deliverableId);
  if (error) throw error;
  revalidatePath("/company");
}
