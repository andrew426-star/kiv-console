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

// Reads live from the real GLE spreadsheet — there is no local copy of this
// data. Returns [] (not an error) when Google isn't connected yet or the
// tabs don't exist, matching the app's "honest empty state" convention.
export async function getLeads(): Promise<Lead[]> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return [];

  const tabs = await getSheetTabTitles(accessToken, GLE_SPREADSHEET_ID);
  if (!tabs.includes(MAPS_DATA_TAB)) return [];

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
  return mapsRows
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
}
