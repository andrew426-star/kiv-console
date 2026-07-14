import { createClient } from "@/lib/supabase/server";
import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getRows } from "@/lib/google/sheets";
import { SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB } from "@/lib/ale/spreadsheets";

export type Prospect = {
  companyName: string;
  docUrl: string;
  generatedAt: string;
};

export type ProspectsResult =
  | { connected: false }
  | { connected: true; prospects: Prospect[] }
  | { connected: true; fetchError: string };

// Prospects live entirely in the real ALE Sales Pitch Log spreadsheet —
// there's no Supabase row for a prospect. A company drops off this list
// once it's promoted to a Lead (a real `clients` row), which is what the
// `clients.name` exclusion below checks for.
export async function getProspects(): Promise<ProspectsResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  try {
    const [pitchRows, supabase] = await Promise.all([
      getRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB),
      createClient(),
    ]);

    const { data: existingClients, error } = await supabase.from("clients").select("name");
    if (error) throw error;
    const alreadyPromoted = new Set((existingClients ?? []).map((c) => c.name as string));

    // Columns: Company, Doc URL, Initial Pitch, Email Variation,
    // Follow-Up Call Variation, Demo Setup, Generated At
    const prospects = pitchRows
      .filter((r) => r[0] && !alreadyPromoted.has(r[0]))
      .map((r) => ({ companyName: r[0], docUrl: r[1] ?? "", generatedAt: r[6] ?? "" }))
      .reverse();

    return { connected: true, prospects };
  } catch (err) {
    console.error("Failed to load prospects from the Sales Pitch Log", err);
    return {
      connected: true,
      fetchError: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
