import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getSheetTabTitles, getRows, getColumnValues } from "@/lib/google/sheets";
import {
  GLE_SPREADSHEET_ID,
  MAPS_DATA_TAB,
  WEBSITES_TAB,
  HUNTER_TAB,
  ALE_SPREADSHEET_ID,
  COMPANIES_TAB,
  SALES_PITCH_LOG_SPREADSHEET_ID,
  SALES_PITCH_LOG_TAB,
} from "./spreadsheets";

export type Lead = {
  placeId: string;
  name: string;
  types: string;
  rating: string;
  address: string;
  state: string;
  website: string | null;
  contactCount: number;
  researched: boolean;
  pitched: boolean;
  landingPageUrl: string | null;
};

export type LeadsResult =
  | { connected: false }
  | { connected: true; leads: Lead[] }
  | { connected: true; fetchError: string };

// Reads live from the real GLE/ALE spreadsheets — there is no local copy of
// this data. A fetch failure (e.g. the Google connection needs re-consent
// for a new scope) surfaces as an honest fetchError rather than crashing
// the page — same discriminated-union shape as getCalendarState().
export async function getLeads(): Promise<LeadsResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  try {
    const [gleTabs, aleTabs] = await Promise.all([
      getSheetTabTitles(accessToken, GLE_SPREADSHEET_ID),
      getSheetTabTitles(accessToken, ALE_SPREADSHEET_ID),
    ]);
    if (!gleTabs.includes(MAPS_DATA_TAB)) return { connected: true, leads: [] };

    const [mapsRows, websiteRows, hunterRows, researchedPlaceIds, pitchLogRows] = await Promise.all([
      getRows(accessToken, GLE_SPREADSHEET_ID, MAPS_DATA_TAB),
      gleTabs.includes(WEBSITES_TAB)
        ? getRows(accessToken, GLE_SPREADSHEET_ID, WEBSITES_TAB)
        : Promise.resolve([] as string[][]),
      gleTabs.includes(HUNTER_TAB)
        ? getRows(accessToken, GLE_SPREADSHEET_ID, HUNTER_TAB)
        : Promise.resolve([] as string[][]),
      aleTabs.includes(COMPANIES_TAB)
        ? getColumnValues(accessToken, ALE_SPREADSHEET_ID, COMPANIES_TAB, "A") // Company Name
        : Promise.resolve([] as string[]),
      // Separate spreadsheet — the "ALE Sales Pitch Log" tab doesn't exist
      // until the first sales pitch is ever generated, so a missing-tab
      // error here just means "nothing pitched yet." Full rows (not just
      // column A) so the Landing Page URL column is available too.
      getRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB).catch(
        () => [] as string[][],
      ),
    ]);

    // Websites columns: name, website, place_id, formatted_address, user_ratings_total, rating
    const websiteByPlaceId = new Map(websiteRows.map((r) => [r[2], r[1]]));

    // Hunter columns: place_id, ... one row per contact found
    const contactCountByPlaceId = new Map<string, number>();
    for (const r of hunterRows) {
      const placeId = r[0];
      if (!placeId) continue;
      contactCountByPlaceId.set(placeId, (contactCountByPlaceId.get(placeId) ?? 0) + 1);
    }

    const researched = new Set(researchedPlaceIds);
    // Last write wins per company (in case of a re-pitch) — Landing Page
    // URL is column index 9, matching SALES_PITCH_LOG_HEADER.
    const latestPitchByName = new Map<string, string[]>();
    for (const row of pitchLogRows) {
      if (row[0]) latestPitchByName.set(row[0], row);
    }

    // Maps Data columns: name, place_id, types, rating, address, latitude, longitude, state
    const leads = mapsRows
      .map((r) => ({
        name: r[0] ?? "",
        placeId: r[1] ?? "",
        types: r[2] ?? "",
        rating: r[3] ?? "",
        address: r[4] ?? "",
        state: r[7] ?? "",
        website: websiteByPlaceId.get(r[1]) ?? null,
        contactCount: contactCountByPlaceId.get(r[1]) ?? 0,
        // Companies/Sales Pitch Log tabs have no place_id column (pre-existing
        // schema) — both keyed by Company Name instead.
        researched: researched.has(r[0]),
        pitched: latestPitchByName.has(r[0]),
        landingPageUrl: latestPitchByName.get(r[0])?.[9] || null,
      }))
      .reverse();

    return { connected: true, leads };
  } catch (err) {
    console.error("Failed to load ALE leads from Google Sheets", err);
    return {
      connected: true,
      fetchError: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
