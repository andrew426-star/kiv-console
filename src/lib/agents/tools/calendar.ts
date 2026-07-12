import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken, fetchUpcomingEvents, type GoogleCalendarEvent } from "@/lib/calendar/google";

export type CalendarForAgent =
  | { connected: false }
  | { connected: true; events: GoogleCalendarEvent[] };

// Admin-scoped mirror of getCalendarState() (src/lib/calendar/queries.ts).
// K.I.V. is single-tenant today — there's exactly one connected calendar —
// so this grabs that one row directly rather than filtering by a specific
// authenticated user (there is no session in a Slack webhook context).
export async function getCalendarEventsForAgent(): Promise<CalendarForAgent> {
  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("calendar_connections")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!connection) return { connected: false };

  let accessToken = connection.access_token as string | null;
  const expiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at as string)
    : null;

  if (!accessToken || !expiresAt || expiresAt.getTime() < Date.now() + 60_000) {
    const refreshed = await refreshAccessToken(connection.refresh_token as string);
    accessToken = refreshed.access_token;
    await admin
      .from("calendar_connections")
      .update({
        access_token: accessToken,
        access_token_expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000,
        ).toISOString(),
      })
      .eq("profile_id", connection.profile_id as string);
  }

  const events = await fetchUpcomingEvents(accessToken!, { days: 14 });
  return { connected: true, events };
}
