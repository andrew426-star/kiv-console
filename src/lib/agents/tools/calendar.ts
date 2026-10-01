import { fetchUpcomingEvents } from "@/lib/calendar/google";
import { fetchSchoolEvents } from "@/lib/calendar/queries";
import {
  CALENDAR_TIME_ZONE,
  mergeAccountEvents,
  organizeCalendar,
  type OrganizedCalendar,
} from "@/lib/calendar/organize";
import { getWorkspaceAccessToken } from "@/lib/google/access-token";
import type { SchoolConnectionStatus } from "@/lib/google/school-access-token";

export type CalendarForAgent =
  | { connected: false }
  | ({ connected: true; timeZone: string; schoolAccount: SchoolConnectionStatus } & OrganizedCalendar);

// Admin-scoped mirror of getCalendarState() (src/lib/calendar/queries.ts) —
// K.I.V. is single-tenant today, so there's exactly one connected account
// and no session in a Slack webhook context to look one up by. Returns the
// same organized view the Calendar page shows (highlights, weekly routine,
// day-by-day agenda) with times already in Central, so an agent never
// reads a raw UTC timestamp as Andrew's local time. Louisiana Tech events
// are merged in with source "school"; everything else is "workspace".
export async function getCalendarEventsForAgent(): Promise<CalendarForAgent> {
  const accessToken = await getWorkspaceAccessToken();
  if (!accessToken) return { connected: false };

  const [events, school] = await Promise.all([
    fetchUpcomingEvents(accessToken, { days: 14 }),
    fetchSchoolEvents(),
  ]);
  return {
    connected: true,
    timeZone: CALENDAR_TIME_ZONE,
    schoolAccount: school.status,
    ...organizeCalendar(mergeAccountEvents(events, school.items)),
  };
}
