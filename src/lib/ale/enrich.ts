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

type HunterSearch = { emails: HunterEmail[]; known: number | null };

async function huntDomain(domain: string): Promise<HunterSearch> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) throw new Error("HUNTER_API_KEY is not configured");

  const res = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}`,
  );
  if (!res.ok) throw new Error(`Hunter domain search failed: ${await res.text()}`);
  const data = (await res.json()) as {
    data?: { emails?: HunterEmail[] };
    meta?: { results?: number };
    errors?: { details?: string }[];
  };
  if (data.errors?.length) {
    throw new Error(`Hunter domain search failed: ${data.errors.map((e) => e.details).join("; ")}`);
  }
  return { emails: data.data?.emails ?? [], known: data.meta?.results ?? null };
}

function extractDomain(website: string): string {
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return website;
  }
}

export type EnrichResult = { contactsFound: number; domain: string };

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

  const domain = extractDomain(website);
  const { emails, known } = await huntDomain(domain);

  if (emails.length === 0) {
    // Only a search where Hunter itself says it knows nobody at the domain
    // is recorded as done. No emails while it reports results (or reports
    // nothing at all) has meant a wrong or restricted HUNTER_API_KEY in this
    // deployment, which must not mark good leads as having no contacts.
    if (known !== 0) {
      throw new Error(
        `Hunter returned no emails for ${domain} but reports ${known ?? "an unknown number of"} results. ` +
          "Check HUNTER_API_KEY in this deployment's environment.",
      );
    }
    // One row with the lead's details and no email: "searched, nobody
    // found". It moves the lead on to research (stage.ts), and the batch
    // run's "already enriched" check (batch.ts) skips searching it again.
    await appendRows(accessToken, GLE_SPREADSHEET_ID, HUNTER_TAB, [
      [placeId, formattedAddress ?? "", name ?? "", website, userRatingsTotal ?? "", rating ?? ""],
    ]);
    return { contactsFound: 0, domain };
  }

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

  return { contactsFound: emails.length, domain };
}
