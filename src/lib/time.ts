// Every time K.I.V. shows or reasons about is US Central — Andrew is in
// Ruston, and the server runs in UTC on Render, where a bare
// toLocaleString() prints UTC. Format through these instead.

export const TIME_ZONE = "America/Chicago";

// Timestamps (an instant: created_at, publishedAt, event start). The zone
// abbreviation (CDT/CST) is shown so a time is never ambiguous.
export function formatDateTime(iso: string | number | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

// The Central calendar day an instant falls on.
export function formatDate(iso: string | number | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

// A date with no time ("2026-10-05", a due date). new Date() reads that as
// UTC midnight, which is the previous evening in Central, so it's shown as
// written rather than converted.
export function formatDateOnly(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

// The current Central date and time, spelled out for an AI's system prompt
// so "today" and "tomorrow" mean Andrew's today and tomorrow.
export function nowForPrompt(now: Date = new Date()): string {
  const text = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(now);
  return `Current date and time: ${text} (US Central, Andrew's time zone). Interpret "today", "tomorrow", "this week" and every time you mention in Central.`;
}
