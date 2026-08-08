import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { logAgentActivity } from "@/lib/agents/log";
import {
  sendOutreachEmailForAgent,
  type SendOutreachEmailResult,
} from "@/lib/agents/tools/send-outreach-email";
import {
  getQueuedOutreach,
  dequeueOutreach,
  OUTREACH_DRIP_PER_RUN,
  SEND_SPACING_MS,
} from "./outreach-queue";

export type DripOutcome = {
  companyName: string;
  result: SendOutreachEmailResult;
  // True if this company was taken out of the queue without being sent,
  // because retrying it hourly would fail identically forever.
  dequeued: boolean;
};

export type DripResult = {
  sent: number;
  outcomes: DripOutcome[];
  // Left in the queue for the next run — includes anything this run didn't
  // reach, plus retryable failures.
  stillQueued: number;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Statuses that will never succeed on a later run without a human fixing
// something in the sheets first, so the row comes out of the queue.
// Everything else (rate_limited, a thrown Zoho/Sheets error, a
// disconnected integration) is transient and stays queued, which is the
// whole point of the queue. "already_sent" isn't here because its row's
// "Email Sent At" cell is populated by definition, and that alone is what
// takes a row out of getQueuedOutreach().
const TERMINAL_STATUSES = new Set<SendOutreachEmailResult["status"]>([
  "no_pitch_found",
  "no_draft_email",
  "no_contact_email",
]);

// The resume half of the rate limit. sendBulkOutreachEmailsForAgent()
// sends what this hour allows and queues the rest; this runs on a schedule
// (see .github/workflows/ale-outreach-drip.yml) and drains that queue a
// few at a time, so a 28-company backlog finishes itself over the day
// instead of stopping dead the first time the cap is hit.
//
// Every guardrail still lives in sendOutreachEmailForAgent() — this adds
// no send logic of its own, so the hourly cap, the duplicate-send check
// and most-senior-contact selection all apply here exactly as they do to a
// send Andrew triggers by hand.
export async function runOutreachDrip(limit = OUTREACH_DRIP_PER_RUN): Promise<DripResult> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) throw new Error("Google account not connected");

  const queue = await getQueuedOutreach(accessToken);
  if (queue.length === 0) return { sent: 0, outcomes: [], stillQueued: 0 };

  const batch = queue.slice(0, Math.max(0, limit));
  const outcomes: DripOutcome[] = [];
  let dequeuedCount = 0;
  let hitRateLimit = false;

  for (let i = 0; i < batch.length; i++) {
    const { companyName, rowNumber } = batch[i];

    let result: SendOutreachEmailResult;
    try {
      result = await sendOutreachEmailForAgent(companyName);
    } catch (err) {
      // Already logged in detail by the sender. Stays queued: a Zoho
      // hiccup or a sheet write-back failure is worth another pass.
      await logAgentActivity({
        agentId: "pipeline",
        action: `Outreach drip: error on "${companyName}"`,
        status: "error",
        detail: err instanceof Error ? err.message : String(err),
      }).catch(() => {});
      continue;
    }

    // Nothing left in the allowance — stop rather than burn the remaining
    // queue on attempts that would all return the same thing.
    if (result.status === "rate_limited") {
      hitRateLimit = true;
      break;
    }

    const dequeued = TERMINAL_STATUSES.has(result.status);
    if (dequeued) {
      await dequeueOutreach(accessToken, rowNumber).catch(() => {});
      dequeuedCount += 1;
      await logAgentActivity({
        agentId: "pipeline",
        action: `Outreach drip: dropped "${companyName}" from the queue`,
        status: "warning",
        detail: `Nothing to send (${result.status}) — fix the Sales Pitch Log row, then re-queue.`,
      }).catch(() => {});
    }

    outcomes.push({ companyName, result, dequeued });

    if (i < batch.length - 1) await sleep(SEND_SPACING_MS);
  }

  const sent = outcomes.filter((o) => o.result.status === "sent").length;
  const stillQueued = queue.length - sent - dequeuedCount;

  await logAgentActivity({
    agentId: "pipeline",
    action: "Outreach drip run complete",
    status: sent > 0 ? "success" : "info",
    detail: `${sent} sent, ${stillQueued} still queued${hitRateLimit ? " (hourly send limit reached — resumes next run)" : ""}`,
  }).catch(() => {});

  return { sent, outcomes, stillQueued };
}
