import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withSchoolAccount, type SchoolConnectionStatus } from "@/lib/google/school-access-token";
import { fetchUpcomingEvents, refreshAccessToken, type GoogleCalendarEvent } from "./google";
import { mergeAccountEvents } from "./organize";

// `school` rides along on the connected states: the Louisiana Tech
// calendar is an add-on to the Workspace one, merged into `events`, and
// its own status is reported separately so it can fail on its own.
export type CalendarState =
  | { connected: false }
  | {
      connected: true;
      calendarEmail: string;
      events: GoogleCalendarEvent[];
      school: SchoolConnectionStatus;
    }
  | { connected: true; calendarEmail: string; fetchError: string; school: SchoolConnectionStatus };

const CALENDAR_DAYS = 14;

export function fetchSchoolEvents() {
  return withSchoolAccount((token) => fetchUpcomingEvents(token, { days: CALENDAR_DAYS }));
}

export async function getCalendarState(): Promise<CalendarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false };

  const admin = await createAdminClient();
  const { data: connection } = await admin
    .from("calendar_connections")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!connection) return { connected: false };

  const calendarEmail = connection.calendar_email as string;
  const schoolPromise = fetchSchoolEvents();

  try {
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
        .eq("profile_id", user.id);
    }

    const [workspaceEvents, { status: school, items: schoolEvents }] = await Promise.all([
      fetchUpcomingEvents(accessToken!, { days: CALENDAR_DAYS }),
      schoolPromise,
    ]);
    return {
      connected: true,
      calendarEmail,
      events: mergeAccountEvents(workspaceEvents, schoolEvents),
      school,
    };
  } catch (err) {
    // A connected account whose calendar fetch is failing (disabled API,
    // revoked access, rate limit) should show an honest error, not crash
    // the page — the connection itself is still real.
    console.error("Calendar fetch failed for a connected account", err);
    return {
      connected: true,
      calendarEmail,
      fetchError: err instanceof Error ? err.message : "Unknown error",
      school: (await schoolPromise).status,
    };
  }
}
