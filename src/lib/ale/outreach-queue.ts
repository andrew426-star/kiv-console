import { getRows, updateRange } from "@/lib/google/sheets";
import {
  SALES_PITCH_LOG_SPREADSHEET_ID,
  SALES_PITCH_LOG_TAB,
  SALES_PITCH_LOG_HEADER,
  EMAIL_SENT_AT_COL,
  OUTREACH_QUEUED_AT_COL,
  OUTREACH_QUEUED_AT_COLUMN_LETTER,
} from "./spreadsheets";

// How many emails one drip run sends, and how often that run happens.
// Andrew asked for "around 4 per hour" — 4 sits just under
// MAX_SENDS_PER_HOUR (5) in send-outreach-email.ts, so a normal run never
// touches the hard limit and the spare slot stays available for a one-off
// manual send. Both live here rather than next to the sender because the
// sender, the drip runner and the agent-facing tool descriptions all quote
// them, and only one of those can own the constant without an import cycle.
export const OUTREACH_DRIP_PER_RUN = 4;
export const OUTREACH_DRIP_CADENCE = "hourly, 8am-6pm US Central, weekdays";

// A short pause between sends inside a single run. Not the rate limit —
// that's the hourly cap — just enough spacing that four emails don't leave
// Zoho in the same second, which is the pattern spam filters key on.
export const SEND_SPACING_MS = 5_000;

export type QueuedOutreach = {
  companyName: string;
  queuedAt: string;
  // 1-based sheet row, for writing this row's cells back. getRows() drops
  // the header, so array index i is sheet row i + 2.
  rowNumber: number;
};

// ensureTabExists() only writes a header for a tab it had to create, so the
// live Sales Pitch Log — which predates this column — has a blank M1. Write
// it on the way past: a single RAW cell write, same value every time, so
// it's safe to call before every queue operation.
async function ensureQueueHeader(accessToken: string): Promise<void> {
  await updateRange(
    accessToken,
    SALES_PITCH_LOG_SPREADSHEET_ID,
    `'${SALES_PITCH_LOG_TAB}'!${OUTREACH_QUEUED_AT_COLUMN_LETTER}1`,
    [[SALES_PITCH_LOG_HEADER[OUTREACH_QUEUED_AT_COL]]],
  );
}

// Arms companies for the hourly drip. This does NOT send anything — it
// stamps "Outreach Queued At" on each company's row so runOutreachDrip()
// picks it up on its next pass. Deliberately a queue in the sheet Andrew
// already has open rather than a hidden table: he can see what's pending
// and cancel any of it by clearing the cell.
//
// Already-sent rows are never queued (the send path's duplicate guard
// would reject them anyway, and queueing them would just generate hourly
// noise), and a company already in the queue keeps its original
// queuedAt so re-arming a batch doesn't shuffle the FIFO order.
export async function queueCompaniesForOutreach(
  accessToken: string,
  companyNames: string[],
): Promise<{ queued: string[]; skipped: Array<{ companyName: string; reason: string }> }> {
  const wanted = new Set(companyNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  if (wanted.size === 0) return { queued: [], skipped: [] };

  const rows = await getRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB);
  const queuedAt = new Date().toISOString();

  const queued: string[] = [];
  const skipped: Array<{ companyName: string; reason: string }> = [];
  const seen = new Set<string>();

  // Rewrite the whole column in one call rather than one write per company
  // — untouched rows are written back with the value they already had, so
  // a 28-company batch is a single Sheets round trip instead of 28.
  const column = rows.map((row) => {
    const name = row[0]?.trim() ?? "";
    const key = name.toLowerCase();
    const existing = row[OUTREACH_QUEUED_AT_COL] ?? "";
    if (!wanted.has(key)) return existing;

    seen.add(key);
    if (row[EMAIL_SENT_AT_COL]) {
      skipped.push({ companyName: name, reason: "already sent" });
      return existing;
    }
    if (existing) {
      skipped.push({ companyName: name, reason: "already queued" });
      return existing;
    }
    queued.push(name);
    return queuedAt;
  });

  for (const key of wanted) {
    if (!seen.has(key)) {
      skipped.push({ companyName: key, reason: "no row in the Sales Pitch Log" });
    }
  }

  if (queued.length > 0) {
    await ensureQueueHeader(accessToken);
    await updateRange(
      accessToken,
      SALES_PITCH_LOG_SPREADSHEET_ID,
      `'${SALES_PITCH_LOG_TAB}'!${OUTREACH_QUEUED_AT_COLUMN_LETTER}2:${OUTREACH_QUEUED_AT_COLUMN_LETTER}${column.length + 1}`,
      column.map((v) => [v]),
    );
  }

  return { queued, skipped };
}

// Everything still waiting to go out, oldest-queued first. A row leaves the
// queue by being sent (which populates "Email Sent At"), so nothing has to
// clean up after a successful send.
export async function getQueuedOutreach(accessToken: string): Promise<QueuedOutreach[]> {
  const rows = await getRows(accessToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB).catch(
    () => [] as string[][],
  );

  return rows
    .map((row, i) => ({
      companyName: row[0]?.trim() ?? "",
      queuedAt: row[OUTREACH_QUEUED_AT_COL] ?? "",
      sentAt: row[EMAIL_SENT_AT_COL] ?? "",
      rowNumber: i + 2,
    }))
    .filter((r) => r.companyName && r.queuedAt && !r.sentAt)
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))
    .map(({ companyName, queuedAt, rowNumber }) => ({ companyName, queuedAt, rowNumber }));
}

// Drops a single row out of the queue without sending it. Used when a
// queued company can never succeed as-is (no contact email, no draft, no
// row) — leaving it queued would mean retrying the identical failure every
// hour forever. Transient failures are deliberately NOT dequeued here.
export async function dequeueOutreach(accessToken: string, rowNumber: number): Promise<void> {
  await updateRange(
    accessToken,
    SALES_PITCH_LOG_SPREADSHEET_ID,
    `'${SALES_PITCH_LOG_TAB}'!${OUTREACH_QUEUED_AT_COLUMN_LETTER}${rowNumber}`,
    [[""]],
  );
}
