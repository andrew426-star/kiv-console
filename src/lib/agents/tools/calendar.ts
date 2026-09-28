import { fetchUpcomingEvents } from "@/lib/calendar/google";
import { CALENDAR_TIME_ZONE, organizeCalendar, type OrganizedCalendar } from "@/lib/calendar/organize";
import { getWorkspaceAccessToken } from "@/lib/google/access-token";

export type CalendarForAgent =
  | { connected: false }
  | ({ connected: true; timeZone: string } & OrganizedCalendar);

// Admin-scoped mirror of getCalendarState() (src/lib/calendar/queries.ts) —
// K.I.V. is single-tenant today, so there's exactly one connected account
// and no session in a Slack webhook context to look one up by. Returns the
// same organized view the Calendar page shows (highlights, weekly routine,
// day-by-day agenda) with times already in Central, so an agent never
// reads a raw UTC timestamp as Andrew's local time.
export async function getCalendarEventsForAgent(): Promise<CalendarForAgent> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  const events = await fetchUpcomingEvents(accessToken, { days: 14 });
  return { connected: true, timeZone: CALENDAR_TIME_ZONE, ...organizeCalendar(events) };
}
