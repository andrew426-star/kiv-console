import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import { getRows, updateRange } from "@/lib/google/sheets";
import { getZohoAccessToken } from "@/lib/zoho/access-token";
import { sendZohoEmail } from "@/lib/zoho/mail";
import { getContactForCompany } from "@/lib/ale/queries";
import { parseOutreachEmailForSend } from "@/lib/ale/outreach-copy";
import { SALES_PITCH_LOG_SPREADSHEET_ID, SALES_PITCH_LOG_TAB } from "@/lib/ale/spreadsheets";
import { logAgentActivity } from "@/lib/agents/log";
import { createAdminClient } from "@/lib/supabase/admin";

export type SendOutreachEmailResult =
  | { status: "google_not_connected" }
  | { status: "zoho_not_connected" }
  | { status: "no_pitch_found"; companyName: string }
  | { status: "no_draft_email"; companyName: string }
  | { status: "no_contact_email"; companyName: string }
  | { status: "already_sent"; companyName: string; sentAt: string }
  | { status: "rate_limited"; companyName: string }
  | { status: "sent"; companyName: string; to: string; subject: string; sentAt: string };

// Column indices into SALES_PITCH_LOG_HEADER — keep in sync with
// src/lib/ale/spreadsheets.ts. getRows returns rows starting at sheet row
// 2 (header excluded), so a row at array index i is sheet row i + 2.
const OUTREACH_EMAIL_COL = 9;
const EMAIL_SENT_AT_COL = 11;
const EMAIL_SENT_AT_COLUMN_LETTER = "L";

const SEND_LOG_ACTION = "Sent outreach email";
const MAX_SENDS_PER_HOUR = 5;

async function recentSendCount(): Promise<number> {
  const admin = createAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("agent_activity_log")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", "pipeline")
    .eq("action", SEND_LOG_ACTION)
    .eq("status", "success")
    .gte("created_at", oneHourAgo);
  return count ?? 0;
}

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

  const draftEmail = row[OUTREACH_EMAIL_COL];
  if (!draftEmail?.trim()) return { status: "no_draft_email", companyName };

  const contact = await getContactForCompany(workspaceToken, companyName);
  if (!contact) return { status: "no_contact_email", companyName };

  if ((await recentSendCount()) >= MAX_SENDS_PER_HOUR) {
    return { status: "rate_limited", companyName };
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

  return { status: "sent", companyName, to: contact.email, subject, sentAt };
}
