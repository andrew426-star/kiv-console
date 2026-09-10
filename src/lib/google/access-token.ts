import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/calendar/google";

// Returns a valid access token for K.I.V.'s single connected Google
// Workspace account (there is exactly one row in calendar_connections),
// refreshing it first if it's expired or about to be. Used by any
// server-side code that needs to call Calendar/Sheets/Docs/Drive/Gmail
// without a browser session — the Slack agent tools and the Autonomous
// Lead Engine both need this.
export async function getWorkspaceAccessToken(): Promise<string | null> {
  const admin = await createAdminClient();
  const { data: connection } = await admin
    .from("calendar_connections")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!connection) return null;

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

  return accessToken;
}
