"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DeliverableStage } from "./queries";
import { isDelegateAgentId, sanitizeDelegateActions } from "@/lib/agents/delegation";

const ROLES = ["owner", "admin", "contractor", "viewer"] as const;
const STAGE_ORDER: DeliverableStage[] = ["backlog", "in_progress", "review", "delivered"];

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// The delegation section of the project and task forms. An agent plus
// its ticked actions is Andrew's approval for that agent to act on the
// work unattended; clearing the agent clears the approval with it.
function delegation(formData: FormData) {
  const agentId = str(formData, "delegate_agent_id");
  const delegateAgentId = isDelegateAgentId(agentId) ? agentId : null;
  const actions = formData.getAll("delegate_actions").filter((a): a is string => typeof a === "string");
  return {
    delegate_agent_id: delegateAgentId,
    delegate_actions: sanitizeDelegateActions(delegateAgentId, actions),
    delegation_notes: delegateAgentId ? str(formData, "delegation_notes") : null,
  };
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
    status: str(formData, "status") ?? "lead",
  });
  if (error) throw error;
  revalidatePath("/company");
}

export async function updateClientRecord(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ name: str(formData, "name"), status: str(formData, "status") ?? "lead" })
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

// --- Client pipeline: Prospect -> Lead -> Client ----------------------------

// A Prospect is a row in the real ALE Sales Pitch Log spreadsheet, not a
// Supabase record — promoting one just means creating the first `clients`
// row for that company, as a lead.
export async function promoteProspectToLead(companyName: string, docUrl: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").insert({
    name: companyName,
    status: "lead",
    source: "ale",
    ale_doc_url: docUrl,
  });
  if (error) throw error;
  revalidatePath("/company");
}

export async function promoteLeadToClient(clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update({ status: "active" }).eq("id", clientId);
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
    ...delegation(formData),
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
      ...delegation(formData),
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
    ...delegation(formData),
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
      ...delegation(formData),
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
