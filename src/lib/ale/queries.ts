import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getSheetTabTitles, getRows, getColumnValues } from "@/lib/google/sheets";
import {
  GLE_SPREADSHEET_ID,
  MAPS_DATA_TAB,
  WEBSITES_TAB,
  HUNTER_TAB,
  ALE_SPREADSHEET_ID,
  COMPANIES_TAB,
  CONTACTS_TAB,
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
  try {
    const accessToken = await getWorkspaceAccessToken();
    if (!accessToken) return { connected: false };

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
      // error here just means "nothing pitched yet."
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
    // Last write wins per company (in case of a re-pitch) — only used below
    // to check whether a pitch exists at all.
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

export type OutreachContact = { name: string; email: string; title: string };

// Stage 2's curated per-company contact list — always populated before a
// pitch can exist, since generateSalesPitch() requires a Companies entry
// which itself requires this tab. First row with both a real Contact Name
// and Email, in sheet order — the simplest defensible pick; no "best
// contact" ranking exists (or is needed) beyond that yet. Accepts an
// already-fetched access token rather than calling
// getWorkspaceAccessToken() itself, since callers (e.g. the outreach-send
// tool) already have one from an earlier call in the same request.
export async function getContactForCompany(
  accessToken: string,
  companyName: string,
): Promise<OutreachContact | null> {
  const rows = await getRows(accessToken, ALE_SPREADSHEET_ID, CONTACTS_TAB);
  // Columns: Company Name, Website, Location, Phone, Business Overview,
  // Contact Name, Title, Email, LinkedIn, Instagram, Twitter (X), Facebook
  const match = rows.find(
    (r) => r[0]?.toLowerCase() === companyName.toLowerCase() && r[5]?.trim() && r[7]?.trim(),
  );
  return match ? { name: match[5], email: match[7], title: match[6] ?? "" } : null;
}
