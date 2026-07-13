import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getRows } from "@/lib/google/sheets";
import { logAgentActivity } from "@/lib/agents/log";
import { discoverCompanies } from "./discover";
import { enrichWithHunter } from "./enrich";
import { researchCompanyAndContacts } from "./research";
import { generateSalesPitch } from "./salespitch";
import { getPendingLeads } from "./queue";
import {
  GLE_SPREADSHEET_ID,
  HUNTER_TAB,
  ALE_SPREADSHEET_ID,
  COMPANIES_TAB,
  SALES_PITCH_LOG_SPREADSHEET_ID,
  SALES_PITCH_LOG_TAB,
} from "./spreadsheets";

export const WEEKDAY_BATCH_SIZE = 5;

// Only used to top up the backlog once it runs dry — same criteria as the
// original 20-company discovery run. Flagged assumption: auto-rediscovering
// keeps the weekday batch unattended rather than stalling until someone
// clicks "Discover" again; change this (or the query) if that's not wanted.
const DEFAULT_DISCOVERY_QUERY = "hedge funds and asset managers in Dallas, Texas";

export type BatchLeadOutcome = {
  name: string;
  placeId: string;
  docUrl?: string;
  skippedReason?: string;
};

export type BatchResult = {
  rediscovered: boolean;
  outcomes: BatchLeadOutcome[];
};

// Weekday automation entry point: advances up to `limit` leads (default 5)
// through enrichment (if not already done) -> Stage 2 -> Stage 3, in FIFO
// discovery order. Each step is skipped if already done for that lead, so
// re-running (e.g. a retry after a partial failure) is safe.
export async function runWeekdayBatch(limit = WEEKDAY_BATCH_SIZE): Promise<BatchResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) throw new Error("Google account not connected");

  let pending = await getPendingLeads(accessToken);

  let rediscovered = false;
  if (pending.length === 0) {
    await discoverCompanies(DEFAULT_DISCOVERY_QUERY);
    rediscovered = true;
    pending = await getPendingLeads(accessToken);
  }

  const batch = pending.slice(0, limit);
  const outcomes: BatchLeadOutcome[] = [];

  for (const lead of batch) {
    if (!lead.website) {
      outcomes.push({ name: lead.name, placeId: lead.placeId, skippedReason: "no website on file" });
      continue;
    }

    try {
      const hunterRows = await getRows(accessToken, GLE_SPREADSHEET_ID, HUNTER_TAB).catch(
        () => [] as string[][],
      );
      const alreadyEnriched = hunterRows.some((r) => r[0] === lead.placeId);
      if (!alreadyEnriched) {
        await enrichWithHunter(lead.placeId);
      }

      const companiesRows = await getRows(accessToken, ALE_SPREADSHEET_ID, COMPANIES_TAB).catch(
        () => [] as string[][],
      );
      const alreadyResearched = companiesRows.some((r) => r[0] === lead.name);
      if (!alreadyResearched) {
        await researchCompanyAndContacts(lead.placeId);
      }

      const pitchRows = await getRows(
        accessToken,
        SALES_PITCH_LOG_SPREADSHEET_ID,
        SALES_PITCH_LOG_TAB,
      ).catch(() => [] as string[][]); // tab may not exist yet on the very first run
      const alreadyPitched = pitchRows.some((r) => r[0] === lead.name);

      if (alreadyPitched) {
        outcomes.push({
          name: lead.name,
          placeId: lead.placeId,
          skippedReason: "already has a sales pitch",
        });
        continue;
      }

      const { docUrl } = await generateSalesPitch(lead.placeId);
      outcomes.push({ name: lead.name, placeId: lead.placeId, docUrl });

      await logAgentActivity({
        agentId: "pipeline",
        action: `Weekday batch: processed "${lead.name}"`,
        detail: `Sales pitch doc: ${docUrl}`,
        status: "success",
      }).catch(() => {});
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      outcomes.push({ name: lead.name, placeId: lead.placeId, skippedReason: message });
      await logAgentActivity({
        agentId: "pipeline",
        action: `Weekday batch: failed on "${lead.name}"`,
        detail: message,
        status: "error",
      }).catch(() => {});
    }
  }

  const fullyProcessed = outcomes.filter((o) => o.docUrl).length;
  await logAgentActivity({
    agentId: "pipeline",
    action: "Weekday batch run complete",
    detail: `${fullyProcessed}/${batch.length} leads fully processed${rediscovered ? " (backlog topped up with a fresh discovery run)" : ""}`,
    status: "info",
  }).catch(() => {});

  return { rediscovered, outcomes };
}
