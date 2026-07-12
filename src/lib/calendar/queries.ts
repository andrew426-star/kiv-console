import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchUpcomingEvents, refreshAccessToken, type GoogleCalendarEvent } from "./google";

export type CalendarState =
  | { connected: false }
  | { connected: true; calendarEmail: string; events: GoogleCalendarEvent[] }
  | { connected: true; calendarEmail: string; fetchError: string };

export async function getCalendarState(): Promise<CalendarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { connected: false };

  const admin = createAdminClient();
  const { data: connection } = await admin
    .from("calendar_connections")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!connection) return { connected: false };

  const calendarEmail = connection.calendar_email as string;

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

    const events = await fetchUpcomingEvents(accessToken!, { days: 14 });
    return { connected: true, calendarEmail, events };
  } catch (err) {
    // A connected account whose calendar fetch is failing (disabled API,
    // revoked access, rate limit) should show an honest error, not crash
    // the page — the connection itself is still real.
    console.error("Calendar fetch failed for a connected account", err);
    return {
      connected: true,
      calendarEmail,
      fetchError: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
