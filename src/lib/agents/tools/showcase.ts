import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getRows } from "@/lib/google/sheets";
import { generateShowcase } from "@/lib/ale/showcase";
import { SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB } from "@/lib/ale/spreadsheets";

export type ShowcaseForAgentResult =
  | { connected: false }
  | { connected: true; found: false }
  | { connected: true; found: true; docUrl: string };

// Blueprint's "when prompted" path — re-runs (or first-runs) a showcase for
// a company that already has a sales pitch on file, reusing its Demo Setup.
export async function generateShowcaseForAgent(companyName: string): Promise<ShowcaseForAgentResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  const rows = await getRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB);
  // Columns: Company, Doc URL, Initial Pitch, Email Variation,
  // Follow-Up Call Variation, Demo Setup, Generated At, Showcase Doc URL
  const row = rows.find((r) => r[0]?.toLowerCase() === companyName.toLowerCase());
  if (!row) return { connected: true, found: false };

  const demoSetup = row[5] ?? "";
  const result = await generateShowcase(accessToken, row[0], demoSetup);
  return { connected: true, found: true, docUrl: result.docUrl };
}
