import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getRows } from "@/lib/google/sheets";
import { listContactsByCompany, UNRANKED_SENIORITY } from "@/lib/ale/queries";
import {
  SALES_PITCH_LOG_SPREADSHEET_ID,
  SALES_PITCH_LOG_TAB,
  EMAIL_SENT_AT_COL,
  OUTREACH_QUEUED_AT_COL,
} from "@/lib/ale/spreadsheets";

export type OutreachContactForAgent = {
  name: string;
  title: string;
  email: string;
  // 1 = most senior. Contacts are listed in this order, so the first entry
  // is the one an outreach email would actually go to.
  seniorityRank: number;
  seniority: string;
  willReceiveOutreach: boolean;
};

export type OutreachContactsForAgent =
  | { connected: false }
  | {
      connected: true;
      companies: Array<{
        companyName: string;
        pitchStage: "no_draft" | "drafted" | "queued" | "sent";
        sentAt: string | null;
        queuedAt: string | null;
        contacts: OutreachContactForAgent[];
      }>;
      // Set when the caller named a company that has no contacts on file
      // at all, so the agent says that plainly instead of reporting an
      // empty list as if it had checked and found nothing relevant.
      notFound?: string;
    };

const MAX_COMPANIES_LISTED = 50;

// Answers the question Pipeline previously had to refuse: who is on file
// for each company, what their titles are, and which one an outreach email
// would go to. Read-only — this sends nothing and queues nothing.
//
// Pass a companyName to drill into one company; omit it for every company
// that has a pitch drafted (the population mass outreach actually targets).
export async function getOutreachContactsForAgent(
  companyName?: string,
): Promise<OutreachContactsForAgent> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  const [contactsByCompany, pitchRows] = await Promise.all([
    listContactsByCompany(accessToken),
    getRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB).catch(
      () => [] as string[][],
    ),
  ]);

  // Last write wins per company, matching getLeads()'s handling of re-pitches.
  const pitchByCompany = new Map<string, string[]>();
  for (const row of pitchRows) {
    if (row[0]?.trim()) pitchByCompany.set(row[0].trim(), row);
  }

  const wanted = companyName?.trim().toLowerCase();
  const names = wanted
    ? [...contactsByCompany.keys()].filter((n) => n.toLowerCase() === wanted)
    : // No name given: only companies with a pitch on file, since those are
      // the ones outreach can actually go to. Contacts exist for plenty of
      // companies that haven't reached Stage 3 yet.
      [...contactsByCompany.keys()].filter((n) => pitchByCompany.has(n));

  if (wanted && names.length === 0) {
    return { connected: true, companies: [], notFound: companyName?.trim() };
  }

  const companies = names.slice(0, MAX_COMPANIES_LISTED).map((name) => {
    const contacts = contactsByCompany.get(name) ?? [];
    const pitchRow = pitchByCompany.get(name);
    const sentAt = pitchRow?.[EMAIL_SENT_AT_COL]?.trim() || null;
    const queuedAt = pitchRow?.[OUTREACH_QUEUED_AT_COL]?.trim() || null;

    return {
      companyName: name,
      pitchStage: !pitchRow
        ? ("no_draft" as const)
        : sentAt
          ? ("sent" as const)
          : queuedAt
            ? ("queued" as const)
            : ("drafted" as const),
      sentAt,
      queuedAt,
      contacts: contacts.map((c, i) => ({
        name: c.name,
        title: c.title,
        email: c.email,
        seniorityRank: c.seniorityRank,
        seniority:
          c.seniorityRank === UNRANKED_SENIORITY
            ? `${c.seniorityLabel} — ranked last, below every recognised management title`
            : c.seniorityLabel,
        // Sorted most-senior-first upstream, so this is purely positional.
        willReceiveOutreach: i === 0,
      })),
    };
  });

  return { connected: true, companies };
}
