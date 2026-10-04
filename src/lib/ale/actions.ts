"use server";

import { revalidatePath } from "next/cache";
import { discoverCompanies } from "./discover";
import { enrichWithHunter, type EnrichResult } from "./enrich";
import { researchCompanyAndContacts } from "./research";
import { generateSalesPitch } from "./salespitch";
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

// Returns the outcome rather than throwing: in production Next.js replaces
// a thrown server-action error with a generic message, and the button needs
// to say what happened (nobody found, or a misconfigured Hunter key).
export type EnrichOutcome = ({ ok: true } & EnrichResult) | { ok: false; error: string };

export async function runEnrichment(placeId: string): Promise<EnrichOutcome> {
  try {
    const result = await enrichWithHunter(placeId);
    await logAgentActivity({
      agentId: "pipeline",
      action: "Enriched lead with Hunter",
      detail: `${result.contactsFound} contacts found at ${result.domain}`,
      status: "success",
    }).catch(() => {});
    revalidatePath("/autonomy");
    return { ok: true, ...result };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    await logAgentActivity({
      agentId: "pipeline",
      action: "Enrichment failed",
      detail: error,
      status: "error",
    }).catch(() => {});
    return { ok: false, error };
  }
}

export async function runResearch(placeId: string) {
  try {
    const result = await researchCompanyAndContacts(placeId);
    await logAgentActivity({
      agentId: "pipeline",
      action: "Researched company + contacts",
      detail: `${result.contactsWritten} contacts written to ALE`,
      status: "success",
    }).catch(() => {});
    revalidatePath("/autonomy");
  } catch (err) {
    await logAgentActivity({
      agentId: "pipeline",
      action: "Research failed",
      detail: err instanceof Error ? err.message : "Unknown error",
      status: "error",
    }).catch(() => {});
    throw err;
  }
}

export async function runSalesPitch(placeId: string) {
  try {
    const result = await generateSalesPitch(placeId);
    await logAgentActivity({
      agentId: "pipeline",
      action: "Generated sales pitch",
      detail: result.folderFound
        ? `Doc: ${result.docUrl}`
        : `Doc: ${result.docUrl} (Drive folder "Sales Pitches: Investment Institutions" not found — left in My Drive)`,
      status: "success",
    }).catch(() => {});
    revalidatePath("/autonomy");
  } catch (err) {
    await logAgentActivity({
      agentId: "pipeline",
      action: "Sales pitch generation failed",
      detail: err instanceof Error ? err.message : "Unknown error",
      status: "error",
    }).catch(() => {});
    throw err;
  }
}
