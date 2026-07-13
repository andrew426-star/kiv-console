import { getRows } from "@/lib/google/sheets";
import {
  GLE_SPREADSHEET_ID,
  MAPS_DATA_TAB,
  WEBSITES_TAB,
  SALES_PITCH_LOG_SPREADSHEET_ID,
  SALES_PITCH_LOG_TAB,
} from "./spreadsheets";

export type PendingLead = {
  placeId: string;
  name: string;
  website: string | null;
};

// The backlog is derived live from the real sheets rather than tracked
// separately — a lead's presence/absence in the Sales Pitch Log tab *is*
// its progress state (not the Companies tab: a lead that finished Stage 2
// but never got a finished pitch — e.g. Stage 3 errored, or its doc was
// wiped for a redo — must still come back around, not just leads that
// never started Stage 2). FIFO order: Maps Data rows are appended in
// discovery order, so the earliest-discovered, not-yet-pitched lead is
// first; the per-lead batch step then does whichever of enrich/research/
// pitch is still outstanding for it.
export async function getPendingLeads(accessToken: string): Promise<PendingLead[]> {
  const [mapsRows, websiteRows, pitchedRows] = await Promise.all([
    getRows(accessToken, GLE_SPREADSHEET_ID, MAPS_DATA_TAB),
    getRows(accessToken, GLE_SPREADSHEET_ID, WEBSITES_TAB),
    getRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB).catch(
      () => [] as string[][],
    ),
  ]);

  const websiteByPlaceId = new Map(websiteRows.map((r) => [r[2], r[1]]));
  const pitched = new Set(pitchedRows.map((r) => r[0]));

  return mapsRows
    .filter((r) => !pitched.has(r[0]))
    .map((r) => ({
      placeId: r[1] ?? "",
      name: r[0] ?? "",
      website: websiteByPlaceId.get(r[1]) ?? null,
    }));
}
