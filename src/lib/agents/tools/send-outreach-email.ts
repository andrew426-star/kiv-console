import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getRows, updateRange } from "@/lib/google/sheets";
import { getZohoAccessToken } from "@/lib/zoho/access-token";
import { sendZohoEmail } from "@/lib/zoho/mail";
import { getLeads, listContactsForCompany } from "@/lib/ale/queries";
import { buildOutreachEmail, parseOutreachEmailForSend } from "@/lib/ale/outreach-copy";
import { scheduleFollowUpCall } from "@/lib/ale/follow-up-call";
import {
  queueCompaniesForOutreach,
  OUTREACH_DRIP_PER_RUN,
  OUTREACH_DRIP_CADENCE,
  SEND_SPACING_MS,
} from "@/lib/ale/outreach-queue";
import {
  SALES_PITCH_LOG_SPREADSHEET_ID,
  SALES_PITCH_LOG_TAB,
  EMAIL_VARIATION_COL,
  OUTREACH_EMAIL_COL,
  VIDEO_URL_COL,
  EMAIL_SENT_AT_COL,
  EMAIL_SENT_AT_COLUMN_LETTER,
} from "@/lib/ale/spreadsheets";
import { logAgentActivity } from "@/lib/agents/log";
import { createAdminClient } from "@/lib/supabase/admin";

export type SendOutreachEmailResult =
  | { status: "google_not_connected" }
  | { status: "zoho_not_connected" }
  | { status: "no_pitch_found"; companyName: string }
  | { status: "no_draft_email"; companyName: string }
  | { status: "no_contact_email"; companyName: string }
  | { status: "already_sent"; companyName: string; sentAt: string }
  // `slotFreesAt` is when the hourly allowance next frees up a slot, so a
  // caller can say when this will actually go out instead of just "later".
  | { status: "rate_limited"; companyName: string; slotFreesAt: string | null }
  | {
      status: "sent";
      companyName: string;
      to: string;
      subject: string;
      sentAt: string;
      // Who it went to and why — the Contacts tab often lists several
      // people per company and outreach picks the most senior (rank 1 =
      // most senior). Reported so Pipeline can name the target and the
      // ones it passed over rather than sending blind.
      contactName: string;
      contactTitle: string;
      seniorityLabel: string;
      moreSeniorAlternatives: number;
      otherContactsOnFile: number;
      // Set only if the email sent fine but the automatic follow-up-call
      // reminder failed to schedule — the send itself is never blocked or
      // retried over this, so callers must report it as a distinct,
      // smaller problem rather than folding it into "sent" as if nothing
      // went wrong.
      followUpCallWarning?: string;
    };

const SEND_LOG_ACTION = "Sent outreach email";
const MAX_SENDS_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

export type SendWindow = {
  used: number;
  remaining: number;
  limitPerHour: number;
  // When the oldest send in the current window ages out and a slot frees
  // up. Null only when nothing has been sent in the last hour (i.e. the
  // full allowance is already available). This is a *rolling* window, not
  // a clock hour: slots come back one at a time, an hour after each send.
  slotFreesAt: string | null;
};

// Replaces a bare count so callers can report *when* sending resumes
// rather than only that it stopped — the difference between "24 companies
// not attempted" and "24 queued, next 4 go out at 12:20 PM".
async function getSendWindow(): Promise<SendWindow> {
  const admin = await createAdminClient();
  const oneHourAgo = new Date(Date.now() - HOUR_MS).toISOString();
  const { data } = await admin
    .from("agent_activity_log")
    .select("created_at")
    .eq("agent_id", "pipeline")
    .eq("action", SEND_LOG_ACTION)
    .eq("status", "success")
    .gte("created_at", oneHourAgo)
    .order("created_at", { ascending: true });

  const sends = data ?? [];
  const oldest = sends[0]?.created_at as string | undefined;
  return {
    used: sends.length,
    remaining: Math.max(0, MAX_SENDS_PER_HOUR - sends.length),
    limitPerHour: MAX_SENDS_PER_HOUR,
    slotFreesAt: oldest ? new Date(new Date(oldest).getTime() + HOUR_MS).toISOString() : null,
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Pipeline's real, live, irreversible send capability — sends the
// already-drafted Outreach Email verbatim (only the subject/signature are
// mechanically split out, never regenerated) to that company's curated
// Contacts-tab email, via kiv-console's own Zoho connection. Every branch
// is a distinct, explicit result rather than a boolean, so a caller can
// never mistake "already sent" or "no draft" for a real send.
export async function sendOutreachEmailForAgent(companyName: string): Promise<SendOutreachEmailResult> {
  const workspaceToken = await getWorkspaceAccessToken();
  if (!workspaceToken) return { status: "google_not_connected" };

  const rows = await getRows(workspaceToken, SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB);
  const rowIndex = rows.findIndex((r) => r[0]?.toLowerCase() === companyName.toLowerCase());
  if (rowIndex === -1) return { status: "no_pitch_found", companyName };
  const row = rows[rowIndex];

  const alreadySentAt = row[EMAIL_SENT_AT_COL];
  if (alreadySentAt) return { status: "already_sent", companyName, sentAt: alreadySentAt };

  // The "Email Variation" is the source of truth for what goes out: it's
  // the full-length pitch email, and it's rendered send-ready here rather
  // than read from the stored "Outreach Email" cell. That matters for the
  // rows drafted before this change — their "Outreach Email" cell still
  // holds the old short "quick idea" template, which must never be sent
  // again, while their Email Variation is the long one Andrew wants used.
  // The stored cell stays as the fallback for any row that somehow has no
  // variation on file.
  const emailVariation = row[EMAIL_VARIATION_COL]?.trim();
  const draftEmail = emailVariation
    ? buildOutreachEmail({
        companyName,
        emailVariation,
        videoLink: row[VIDEO_URL_COL]?.trim() || undefined,
      })
    : row[OUTREACH_EMAIL_COL];
  if (!draftEmail?.trim()) return { status: "no_draft_email", companyName };

  // Ranked most-senior-first; [0] is who this goes to. The rest are only
  // counted, so the result can say what it passed over without dumping
  // every colleague's address into the agent transcript.
  const contacts = await listContactsForCompany(workspaceToken, companyName);
  const contact = contacts[0];
  if (!contact) return { status: "no_contact_email", companyName };

  const window = await getSendWindow();
  if (window.remaining <= 0) {
    return { status: "rate_limited", companyName, slotFreesAt: window.slotFreesAt };
  }

  const zoho = await getZohoAccessToken();
  if (!zoho) return { status: "zoho_not_connected" };

  const { subject, body } = parseOutreachEmailForSend(companyName, draftEmail);

  try {
    await sendZohoEmail(zoho.accessToken, zoho.accountId, {
      fromAddress: zoho.emailAddress,
      toAddress: contact.email,
      subject,
      content: body,
    });
  } catch (err) {
    await logAgentActivity({
      agentId: "pipeline",
      action: "Outreach email send failed",
      status: "error",
      detail: `${companyName} -> ${contact.email}: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(() => {});
    throw err; // fed back to Gemini as {error} by the shared tool loop — Pipeline reports it honestly
  }

  const sentAt = new Date().toISOString();
  try {
    await updateRange(
      workspaceToken,
      SALES_PITCH_LOG_SPREADSHEET_ID,
      `'${SALES_PITCH_LOG_TAB}'!${EMAIL_SENT_AT_COLUMN_LETTER}${rowIndex + 2}`,
      [[sentAt]],
    );
  } catch (err) {
    // The email is ALREADY sent and irreversible at this point — this is a
    // bookkeeping failure, not a send failure. Never let this read as
    // "nothing happened": say plainly that it went out but the duplicate-
    // send guard didn't get recorded, so a human can check by hand.
    await logAgentActivity({
      agentId: "pipeline",
      action: "Outreach email sent but sheet write-back failed",
      status: "error",
      detail: `${companyName} -> ${contact.email}: ${err instanceof Error ? err.message : String(err)}`,
    }).catch(() => {});
    throw new Error(
      `The email to ${contact.email} for ${companyName} WAS sent, but marking it as sent in the ALE Sales Pitch Log failed — check the sheet by hand before sending again, to avoid a duplicate.`,
    );
  }

  await logAgentActivity({
    agentId: "pipeline",
    action: SEND_LOG_ACTION,
    status: "success",
    detail: `${companyName} -> ${contact.email}`,
  }).catch(() => {});

  // The email is sent and recorded — everything from here on is a real
  // but non-blocking enhancement. A failure scheduling the follow-up call
  // must never read as the send having failed.
  let followUpCallWarning: string | undefined;
  try {
    await scheduleFollowUpCall(
      workspaceToken,
      companyName,
      contact,
      { subject, body },
      new Date(sentAt),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    followUpCallWarning = `Follow-up call reminder was NOT scheduled: ${message}`;
    await logAgentActivity({
      agentId: "pipeline",
      action: "Follow-up call scheduling failed",
      status: "warning",
      detail: `${companyName}: ${message}`,
    }).catch(() => {});
  }

  return {
    status: "sent",
    companyName,
    to: contact.email,
    subject,
    sentAt,
    contactName: contact.name,
    contactTitle: contact.title,
    seniorityLabel: contact.seniorityLabel,
    // Always 0 by construction (contacts is sorted most-senior-first) —
    // surfaced anyway so a future change to the picking rule can't
    // silently start mailing the junior contact without it showing up.
    moreSeniorAlternatives: contacts.filter((c) => c.seniorityRank < contact.seniorityRank).length,
    otherContactsOnFile: contacts.length - 1,
    ...(followUpCallWarning ? { followUpCallWarning } : {}),
  };
}

// Sends outreach to several companies in one operation, reusing
// sendOutreachEmailForAgent() (and therefore every one of its guardrails —
// duplicate-send check, draft/contact checks, most-senior-contact
// selection, and the shared hourly rate limit) per company rather than
// duplicating any send logic here.
//
// Whatever doesn't fit in this hour's allowance is QUEUED, not dropped:
// it's stamped into the Sales Pitch Log's "Outreach Queued At" column and
// the hourly drip (src/lib/ale/outreach-drip.ts) works through it at
// OUTREACH_DRIP_PER_RUN an hour until it's empty. That's the timer — a
// request can't sit and sleep for the six hours a 28-company backlog
// needs, so the waiting happens between scheduled runs instead of inside
// this call.
export type BulkSendSummary = {
  attempted: Array<{ companyName: string; result: SendOutreachEmailResult }>;
  // Accepted into the queue and guaranteed a later attempt — NOT sent yet.
  queued: string[];
  // Wanted but not queueable (already sent, already queued, no row).
  skipped: Array<{ companyName: string; reason: string }>;
  // Set if the queue write itself failed, in which case `queued` is empty
  // and those companies got neither sent nor scheduled — must be reported,
  // never folded into a success.
  queueError?: string;
  rateLimit: SendWindow;
  autoResume: { perRun: number; cadence: string };
};

// Omit companyNames (or pass an empty array) to target every company that
// has a drafted-but-unsent pitch and a real contact email on file — "send
// the whole eligible backlog" rather than requiring each name spelled out.
export async function sendBulkOutreachEmailsForAgent(
  companyNames?: string[],
): Promise<BulkSendSummary> {
  let targets = companyNames?.filter((n) => n.trim().length > 0) ?? [];

  if (targets.length === 0) {
    const leadsResult = await getLeads();
    if (leadsResult.connected && "leads" in leadsResult) {
      targets = leadsResult.leads.filter((l) => l.pitchCreated && !l.pitched).map((l) => l.name);
    }
  }

  const attempted: BulkSendSummary["attempted"] = [];
  let remainder: string[] = [];

  // Only attempt what this hour's allowance can actually cover. Anything
  // beyond it would just come back rate_limited, and each of those wasted
  // attempts costs a full Sheets + Contacts read.
  const opening = await getSendWindow();
  const sendNow = targets.slice(0, opening.remaining);
  remainder = targets.slice(opening.remaining);

  for (let i = 0; i < sendNow.length; i++) {
    const companyName = sendNow[i];
    const result = await sendOutreachEmailForAgent(companyName);
    attempted.push({ companyName, result });

    // Still possible despite the pre-check if another send landed
    // concurrently — the rest fall through to the queue below.
    if (result.status === "rate_limited") {
      remainder = [...sendNow.slice(i + 1), ...remainder];
      break;
    }

    if (i < sendNow.length - 1) await sleep(SEND_SPACING_MS);
  }

  let queued: string[] = [];
  let skipped: BulkSendSummary["skipped"] = [];
  let queueError: string | undefined;

  if (remainder.length > 0) {
    const workspaceToken = await getWorkspaceAccessToken();
    try {
      if (!workspaceToken) throw new Error("Google account not connected");
      const outcome = await queueCompaniesForOutreach(workspaceToken, remainder);
      queued = outcome.queued;
      skipped = outcome.skipped;
    } catch (err) {
      queueError = `Could not queue the remaining ${remainder.length} companies for the next drip run: ${
        err instanceof Error ? err.message : String(err)
      }`;
      await logAgentActivity({
        agentId: "pipeline",
        action: "Outreach queue write failed",
        status: "error",
        detail: queueError,
      }).catch(() => {});
    }
  }

  return {
    attempted,
    queued,
    skipped,
    ...(queueError ? { queueError } : {}),
    rateLimit: await getSendWindow(),
    autoResume: { perRun: OUTREACH_DRIP_PER_RUN, cadence: OUTREACH_DRIP_CADENCE },
  };
}
