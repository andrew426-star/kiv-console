import { insertCalendarEvent, type InsertedCalendarEvent } from "@/lib/calendar/google";
import type { OutreachContact } from "./queries";

// Kivaro AI is Dallas, TX — the follow-up call always lands at a fixed
// local business hour in that zone, regardless of what timezone the send
// itself happened to fire in.
const FOLLOW_UP_TIMEZONE = "America/Chicago";
const FOLLOW_UP_HOUR = 10; // 10:00 AM local
const FOLLOW_UP_DURATION_MINUTES = 30;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// Resolves the *local calendar date* (in FOLLOW_UP_TIMEZONE) a UTC instant
// falls on — needed because a send near midnight UTC can be a different
// calendar day in Chicago, and "two days out" should count from the real
// local day the email went out on, not whatever day UTC happens to be at
// that instant.
function chicagoDateParts(instant: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: FOLLOW_UP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

// Two real days after the send's local Chicago date, pushed to the next
// Monday if that lands on a Saturday or Sunday — a weekend slot isn't a
// realistic B2B follow-up-call time. The Y/M/D arithmetic is done via
// Date.UTC on the *local* calendar numbers purely as an integer-day
// calculator (never converted back through a real timezone), which keeps
// this correct across DST transitions with no timezone-offset math of our
// own — Google Calendar resolves the actual wall-clock instant once we
// hand it the resulting Y/M/D + FOLLOW_UP_TIMEZONE.
function followUpDateParts(sentAt: Date): { year: number; month: number; day: number } {
  const { year, month, day } = chicagoDateParts(sentAt);
  const asUtc = new Date(Date.UTC(year, month - 1, day));
  asUtc.setUTCDate(asUtc.getUTCDate() + 2);
  const weekday = asUtc.getUTCDay(); // 0 = Sunday, 6 = Saturday
  if (weekday === 6) asUtc.setUTCDate(asUtc.getUTCDate() + 2); // Sat -> Mon
  if (weekday === 0) asUtc.setUTCDate(asUtc.getUTCDate() + 1); // Sun -> Mon
  return { year: asUtc.getUTCFullYear(), month: asUtc.getUTCMonth() + 1, day: asUtc.getUTCDate() };
}

function buildDescription(
  companyName: string,
  contact: OutreachContact,
  pitch: { subject: string; body: string },
): string {
  const lines = [
    `Follow-up call for ${companyName}.`,
    "",
    `Company: ${contact.website ?? "No website on file — check the Contacts tab"}`,
    `Phone: ${contact.phone ?? "No phone number on file — check the Contacts tab"}`,
    "",
    "--- Pitch sent ---",
    `Subject: ${pitch.subject}`,
    "",
    pitch.body,
  ];
  return lines.join("\n");
}

// Schedules a real follow-up-call reminder on K.I.V.'s connected Google
// Calendar, two business days after a confirmed outreach send. Called
// only after sendOutreachEmailForAgent() has already sent the real email
// — a failure here must never be read as "the email didn't go out," only
// as "the reminder didn't get created," so callers should catch this
// separately rather than let it fail the send itself.
export async function scheduleFollowUpCall(
  workspaceToken: string,
  companyName: string,
  contact: OutreachContact,
  pitch: { subject: string; body: string },
  sentAt: Date,
): Promise<InsertedCalendarEvent> {
  const { year, month, day } = followUpDateParts(sentAt);
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  const endHour = FOLLOW_UP_HOUR + Math.floor(FOLLOW_UP_DURATION_MINUTES / 60);
  const endMinute = FOLLOW_UP_DURATION_MINUTES % 60;

  return insertCalendarEvent(workspaceToken, {
    summary: `Follow-up call — ${companyName}`,
    description: buildDescription(companyName, contact, pitch),
    startISO: `${dateStr}T${pad(FOLLOW_UP_HOUR)}:00:00`,
    endISO: `${dateStr}T${pad(endHour)}:${pad(endMinute)}:00`,
    timeZone: FOLLOW_UP_TIMEZONE,
  });
}
