import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { ensureTabExists, appendRows, getRows } from "@/lib/google/sheets";
import { GLE_SPREADSHEET_ID, WEBSITES_TAB, HUNTER_TAB, HUNTER_HEADER } from "./spreadsheets";

type HunterEmail = {
  value: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  position_raw?: string;
  seniority?: string;
  department?: string;
  linkedin?: string;
  twitter?: string;
  phone_number?: string;
};

async function huntDomain(domain: string): Promise<HunterEmail[]> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) throw new Error("HUNTER_API_KEY is not configured");

  const res = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}`,
  );
  if (!res.ok) throw new Error(`Hunter domain search failed: ${await res.text()}`);
  const data = (await res.json()) as { data?: { emails?: HunterEmail[] } };
  return data.data?.emails ?? [];
}

function extractDomain(website: string): string {
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

export type EnrichResult = { contactsFound: number };

// Stage 1c — Hunter.io domain search for one lead, manually triggered (not
// part of the daily auto-run — matches the spec's own "only when prompted"
// language, and Hunter's limited monthly quota).
export async function enrichWithHunter(placeId: string): Promise<EnrichResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) throw new Error("Google account not connected");

  await ensureTabExists(accessToken, GLE_SPREADSHEET_ID, HUNTER_TAB, HUNTER_HEADER);

  const websiteRows = await getRows(accessToken, GLE_SPREADSHEET_ID, WEBSITES_TAB);
  // Websites columns: name, website, place_id, formatted_address, user_ratings_total, rating
  const row = websiteRows.find((r) => r[2] === placeId);
  if (!row) throw new Error(`No Websites entry found for place_id ${placeId}`);
  const [name, website, , formattedAddress, userRatingsTotal, rating] = row;
  if (!website) throw new Error(`Lead "${name}" has no website to enrich from`);

  const emails = await huntDomain(extractDomain(website));

  const rows = emails.map((e) => [
    placeId,
    formattedAddress ?? "",
    name ?? "",
    website,
    userRatingsTotal ?? "",
    rating ?? "",
    e.value,
    e.first_name ?? "",
    e.last_name ?? "",
    e.position ?? "",
    e.position_raw ?? "",
    e.seniority ?? "",
    e.department ?? "",
    e.linkedin ?? "",
    e.twitter ?? "",
    e.phone_number ?? "",
  ]);
  await appendRows(accessToken, GLE_SPREADSHEET_ID, HUNTER_TAB, rows);

  return { contactsFound: emails.length };
}
