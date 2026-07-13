"use server";

import { revalidatePath } from "next/cache";
import { discoverCompanies } from "./discover";
import { enrichWithHunter } from "./enrich";
import { logAgentActivity } from "@/lib/agents/log";

export async function runDiscovery(formData: FormData) {
  const query = (formData.get("query") as string | null)?.trim();
  if (!query) throw new Error("Search query is required");

  try {
    const result = await discoverCompanies(query);
    await logAgentActivity({
      agentId: "pipeline",
      action: `Discovery run: "${query}"`,
      detail: `${result.newlyAdded} new of ${result.totalFound} found`,
      status: "success",
    }).catch(() => {});
    revalidatePath("/autonomy");
  } catch (err) {
    await logAgentActivity({
      agentId: "pipeline",
      action: `Discovery run failed: "${query}"`,
      detail: err instanceof Error ? err.message : "Unknown error",
      status: "error",
    }).catch(() => {});
    throw err;
  }
}

export async function runEnrichment(placeId: string) {
  try {
    const result = await enrichWithHunter(placeId);
    await logAgentActivity({
      agentId: "pipeline",
      action: "Enriched lead with Hunter",
      detail: `${result.contactsFound} contacts found`,
      status: "success",
    }).catch(() => {});
    revalidatePath("/autonomy");
  } catch (err) {
    await logAgentActivity({
      agentId: "pipeline",
      action: "Enrichment failed",
      detail: err instanceof Error ? err.message : "Unknown error",
      status: "error",
    }).catch(() => {});
    throw err;
  }
}
