import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getSheetTabTitles, getRows } from "@/lib/google/sheets";
import { GLE_SPREADSHEET_ID, MAPS_DATA_TAB, WEBSITES_TAB, HUNTER_TAB } from "./spreadsheets";

export type Lead = {
  placeId: string;
  name: string;
  types: string;
  rating: string;
  address: string;
  state: string;
  website: string | null;
  contactCount: number;
};

export type LeadsResult =
  | { connected: false }
  | { connected: true; leads: Lead[] }
  | { connected: true; fetchError: string };

// Reads live from the real GLE spreadsheet — there is no local copy of this
// data. A fetch failure (e.g. the Google connection needs re-consent for a
// new scope) surfaces as an honest fetchError rather than crashing the
// page — same discriminated-union shape as getCalendarState().
export async function getLeads(): Promise<LeadsResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  try {
    const tabs = await getSheetTabTitles(accessToken, GLE_SPREADSHEET_ID);
    if (!tabs.includes(MAPS_DATA_TAB)) return { connected: true, leads: [] };

    const [mapsRows, websiteRows, hunterRows] = await Promise.all([
      getRows(accessToken, GLE_SPREADSHEET_ID, MAPS_DATA_TAB),
      tabs.includes(WEBSITES_TAB)
        ? getRows(accessToken, GLE_SPREADSHEET_ID, WEBSITES_TAB)
        : Promise.resolve([] as string[][]),
      tabs.includes(HUNTER_TAB)
        ? getRows(accessToken, GLE_SPREADSHEET_ID, HUNTER_TAB)
        : Promise.resolve([] as string[][]),
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
