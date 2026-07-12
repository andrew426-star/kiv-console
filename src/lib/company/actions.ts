"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DeliverableStage } from "./queries";

const ROLES = ["owner", "admin", "contractor", "viewer"] as const;
const STAGE_ORDER: DeliverableStage[] = ["backlog", "in_progress", "review", "delivered"];

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
