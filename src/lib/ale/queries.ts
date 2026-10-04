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
  EMAIL_SENT_AT_COL,
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
  // Hunter has been searched for this lead, whether or not it found anyone
  // (a search that found nobody leaves one row with no email; enrich.ts).
  hunterSearched: boolean;
  researched: boolean;
  // A drafted pitch exists in the ALE Sales Pitch Log — NOT the same as
  // having been sent. Kept distinct from `pitched` below because the two
  // used to be conflated (a company showed as "Pitched" the moment a
  // draft was generated, before any email had actually gone out).
  pitchCreated: boolean;
  // True only once the drafted email has actually been sent and
  // confirmed — i.e. the Sales Pitch Log row's "Email Sent At" cell is
  // populated. This is the real, honest "Pitched" signal.
  pitched: boolean;
  pitchSentAt: string | null;
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

    // Hunter columns: place_id, ... email (column 7), ... One row per contact
    // found, or a single row with no email when the search found nobody.
    const contactCountByPlaceId = new Map<string, number>();
    const hunterSearched = new Set<string>();
    for (const r of hunterRows) {
      const placeId = r[0];
      if (!placeId) continue;
      hunterSearched.add(placeId);
      if (r[6]) contactCountByPlaceId.set(placeId, (contactCountByPlaceId.get(placeId) ?? 0) + 1);
    }

    const researched = new Set(researchedPlaceIds);
    // Last write wins per company (in case of a re-pitch) — used below both
    // to check whether a draft exists at all, and (via column 11, "Email
    // Sent At") whether it was actually sent.
    const latestPitchByName = new Map<string, string[]>();
    for (const row of pitchLogRows) {
      if (row[0]) latestPitchByName.set(row[0], row);
    }

    // Maps Data columns: name, place_id, types, rating, address, latitude, longitude, state
    const leads = mapsRows
      .map((r) => {
        const pitchRow = latestPitchByName.get(r[0]);
        const sentAt = pitchRow?.[EMAIL_SENT_AT_COL] || null;
        return {
          name: r[0] ?? "",
          placeId: r[1] ?? "",
          types: r[2] ?? "",
          rating: r[3] ?? "",
          address: r[4] ?? "",
          state: r[7] ?? "",
          website: websiteByPlaceId.get(r[1]) ?? null,
          contactCount: contactCountByPlaceId.get(r[1]) ?? 0,
          hunterSearched: hunterSearched.has(r[1]),
          // Companies/Sales Pitch Log tabs have no place_id column (pre-existing
          // schema) — both keyed by Company Name instead.
          researched: researched.has(r[0]),
          pitchCreated: !!pitchRow,
          pitched: !!sentAt,
          pitchSentAt: sentAt,
        };
      })
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

export type OutreachContact = {
  name: string;
  email: string;
  title: string;
  // Both pulled from the same Contacts row as name/email — present on most
  // rows but not guaranteed (Stage 2 research doesn't always turn up a
  // phone number), so callers must handle null rather than assume either
  // is populated.
  phone: string | null;
  website: string | null;
  // Where this contact's Title sits on the management ladder — rank 1 is
  // the most senior, UNRANKED_SENIORITY the least. See SENIORITY_TIERS.
  seniorityRank: number;
  seniorityLabel: string;
};

export const UNRANKED_SENIORITY = 99;

// Andrew: outreach should go to the highest person up the management
// ladder that's on file for a company, not whoever Stage 2 research
// happened to write down first. Scanned top-down, first match wins, so
// the more senior pattern must always come before a pattern it contains
// ("Managing Director" before "Director", "Managing Partner" before
// both). The lookbehinds are what stop "Vice President" reading as
// "President" and "Associate Director" as "Director" — the two ways a
// naive substring match would promote a junior contact over their boss.
const SENIORITY_TIERS: Array<{ rank: number; label: string; pattern: RegExp }> = [
  { rank: 1, label: "Founder / Owner", pattern: /\b(co[-\s]?founder|founder|owner|proprietor)\b/i },
  {
    rank: 2,
    label: "Chief executive",
    pattern:
      /\b(?:chief executive|ceo|chairman|chairwoman|chairperson)\b|(?<!vice[\s-])(?<!deputy[\s-])\bpresident\b/i,
  },
  {
    rank: 3,
    label: "C-suite",
    pattern: /\b(?:c[iftmrod]o|chief(?:\s+\w+){1,3}\s+officer|chief\s+\w+)\b/i,
  },
  { rank: 4, label: "Partner", pattern: /\b(managing|general|senior|founding)?\s*partner\b/i },
  {
    rank: 5,
    label: "Managing director / Principal",
    pattern: /\b(managing director|executive director|principal)\b/i,
  },
  {
    rank: 6,
    label: "Head / Director",
    pattern: /\bhead of\b|\bglobal head\b|(?<!associate[\s-])(?<!assistant[\s-])(?<!deputy[\s-])\bdirector\b/i,
  },
  { rank: 7, label: "Vice president", pattern: /\b(vice president|evp|svp|vp)\b/i },
  { rank: 8, label: "Manager", pattern: /\b(manager|associate director|team lead|lead)\b/i },
  { rank: 9, label: "Associate / Analyst", pattern: /\b(associate|analyst|assistant|coordinator)\b/i },
];

// Exported for the agent-facing contacts tool, so Pipeline can explain
// *why* a given contact was picked rather than just naming them.
export function rankContactTitle(title: string): { rank: number; label: string } {
  const clean = (title ?? "").trim();
  if (!clean) return { rank: UNRANKED_SENIORITY, label: "No title on file" };
  const tier = SENIORITY_TIERS.find((t) => t.pattern.test(clean));
  return tier
    ? { rank: tier.rank, label: tier.label }
    : { rank: UNRANKED_SENIORITY, label: "Unranked title" };
}

// Columns: Company Name, Website, Location, Phone, Business Overview,
// Contact Name, Title, Email, LinkedIn, Instagram, Twitter (X), Facebook
function toOutreachContact(row: string[]): OutreachContact {
  const title = row[6] ?? "";
  const { rank, label } = rankContactTitle(title);
  return {
    name: row[5],
    email: row[7],
    title,
    phone: row[3]?.trim() || null,
    website: row[1]?.trim() || null,
    seniorityRank: rank,
    seniorityLabel: label,
  };
}

function isUsableContactRow(row: string[]): boolean {
  return Boolean(row[5]?.trim() && row[7]?.trim());
}

// Every usable contact for one company, most senior first. Ties (two
// contacts on the same rung, or two unranked titles) fall back to sheet
// order, which is the behaviour this whole path had before ranking
// existed — so a company whose titles are all blank picks exactly the same
// contact it always did.
export async function listContactsForCompany(
  accessToken: string,
  companyName: string,
): Promise<OutreachContact[]> {
  const rows = await getRows(accessToken, ALE_SPREADSHEET_ID, CONTACTS_TAB);
  return rows
    .map((row, sheetOrder) => ({ row, sheetOrder }))
    .filter(({ row }) => row[0]?.toLowerCase() === companyName.toLowerCase() && isUsableContactRow(row))
    .map(({ row, sheetOrder }) => ({ contact: toOutreachContact(row), sheetOrder }))
    .sort((a, b) => a.contact.seniorityRank - b.contact.seniorityRank || a.sheetOrder - b.sheetOrder)
    .map(({ contact }) => contact);
}

// The same thing keyed by company, for callers that need the whole book at
// once (the agent-facing contacts tool) — one Sheets read instead of one
// per company.
export async function listContactsByCompany(
  accessToken: string,
): Promise<Map<string, OutreachContact[]>> {
  const rows = await getRows(accessToken, ALE_SPREADSHEET_ID, CONTACTS_TAB);
  const byCompany = new Map<string, Array<{ contact: OutreachContact; sheetOrder: number }>>();

  rows.forEach((row, sheetOrder) => {
    const company = row[0]?.trim();
    if (!company || !isUsableContactRow(row)) return;
    const bucket = byCompany.get(company) ?? [];
    bucket.push({ contact: toOutreachContact(row), sheetOrder });
    byCompany.set(company, bucket);
  });

  return new Map(
    [...byCompany].map(([company, entries]) => [
      company,
      entries
        .sort((a, b) => a.contact.seniorityRank - b.contact.seniorityRank || a.sheetOrder - b.sheetOrder)
        .map(({ contact }) => contact),
    ]),
  );
}

// Stage 2's curated per-company contact list — always populated before a
// pitch can exist, since generateSalesPitch() requires a Companies entry
// which itself requires this tab. Returns the most senior contact on file
// (see listContactsForCompany), which is who outreach actually goes to.
// Accepts an already-fetched access token rather than calling
// getWorkspaceAccessToken() itself, since callers (e.g. the outreach-send
// tool) already have one from an earlier call in the same request.
export async function getContactForCompany(
  accessToken: string,
  companyName: string,
): Promise<OutreachContact | null> {
  const contacts = await listContactsForCompany(accessToken, companyName);
  return contacts[0] ?? null;
}
