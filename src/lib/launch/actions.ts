"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isActivityKind, isSegment, todayInLaunchZone } from "./plan";

function str(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export async function logLaunchActivity(formData: FormData) {
  const kind = str(formData, "kind");
  if (!isActivityKind(kind)) throw new Error(`Invalid kind: ${kind}`);
  const segment = str(formData, "segment");
  if (segment !== null && !isSegment(segment)) throw new Error(`Invalid segment: ${segment}`);

  const supabase = await createClient();
  const { error } = await supabase.from("launch_activity").insert({
    kind,
    segment,
    company: str(formData, "company"),
    contact: str(formData, "contact"),
    notes: str(formData, "notes"),
    occurred_on: str(formData, "occurred_on") ?? todayInLaunchZone(),
    logged_by: "andrew",
  });
  if (error) throw error;
  revalidatePath("/launch");
  revalidatePath("/");
}

export async function deleteLaunchActivity(activityId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("launch_activity").delete().eq("id", activityId);
  if (error) throw error;
  revalidatePath("/launch");
  revalidatePath("/");
}
