import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/calendar/google";

export type SchoolAccount = { email: string; accessToken: string };

// The read-only Louisiana Tech account, if connected — same single-row,
// refresh-when-stale approach as getWorkspaceAccessToken(). Returns null
// when it isn't connected, which every caller treats as "just show the
// Workspace account", never as an error. A refresh failure (revoked
// access, school admin pulled the app) does throw, so callers can report
// it next to the school account rather than hiding it.
export async function getSchoolAccount(): Promise<SchoolAccount | null> {
  const admin = await createAdminClient();
  const { data: connection } = await admin
    .from("school_google_connections")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!connection) return null;

  const email = connection.email as string;
  let accessToken = connection.access_token as string | null;
  const expiresAt = connection.access_token_expires_at
    ? new Date(connection.access_token_expires_at as string)
    : null;

  if (!accessToken || !expiresAt || expiresAt.getTime() < Date.now() + 60_000) {
    const refreshed = await refreshAccessToken(connection.refresh_token as string);
    accessToken = refreshed.access_token;
    await admin
      .from("school_google_connections")
      .update({
        access_token: accessToken,
        access_token_expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000,
        ).toISOString(),
      })
      .eq("profile_id", connection.profile_id as string);
  }

  return { email, accessToken };
}

export type SchoolConnectionStatus =
  | { connected: false }
  | { connected: true; email: string }
  | { connected: true; email: string | null; fetchError: string };

// Fetches something with the school account and folds the outcome into a
// status the UI can show, so a broken school connection never takes the
// Workspace data down with it.
export async function withSchoolAccount<T>(
  fetcher: (accessToken: string) => Promise<T[]>,
): Promise<{ status: SchoolConnectionStatus; items: T[] }> {
  let email: string | null = null;
  try {
    const account = await getSchoolAccount();
    if (!account) return { status: { connected: false }, items: [] };
    email = account.email;
    const items = await fetcher(account.accessToken);
    return { status: { connected: true, email }, items };
  } catch (err) {
    console.error("School Google account fetch failed", err);
    return {
      status: {
        connected: true,
        email,
        fetchError: err instanceof Error ? err.message : "Unknown error",
      },
      items: [],
    };
  }
}
