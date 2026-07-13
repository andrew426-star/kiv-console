import { fetchUpcomingEvents, type GoogleCalendarEvent } from "@/lib/calendar/google";
import { getWorkspaceAccessToken } from "@/lib/google/access-token";

export type CalendarForAgent =
  | { connected: false }
  | { connected: true; events: GoogleCalendarEvent[] };

// Admin-scoped mirror of getCalendarState() (src/lib/calendar/queries.ts) —
// K.I.V. is single-tenant today, so there's exactly one connected account
// and no session in a Slack webhook context to look one up by.
export async function getCalendarEventsForAgent(): Promise<CalendarForAgent> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  const events = await fetchUpcomingEvents(accessToken, { days: 14 });
  return { connected: true, events };
}
