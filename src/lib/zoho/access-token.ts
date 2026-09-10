import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/zoho/oauth";

export type ZohoConnection = {
  accessToken: string;
  accountId: string;
  emailAddress: string;
};

// Same refresh-if-expiring-within-60s pattern as getWorkspaceAccessToken()
// (src/lib/google/access-token.ts), but returns the full connection, not
// just a token string — every Zoho Mail API call needs accountId, and
// every send needs the fromAddress, unlike Calendar/Sheets/Docs calls
// which don't embed an account identifier in the URL.
export async function getZohoAccessToken(): Promise<ZohoConnection | null> {
  const admin = await createAdminClient();
  const { data: connection } = await admin
    .from("zoho_connections")
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
      .from("zoho_connections")
      .update({
        access_token: accessToken,
        access_token_expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000,
        ).toISOString(),
      })
      .eq("profile_id", connection.profile_id as string);
  }

  return {
    accessToken,
    accountId: connection.account_id as string,
    emailAddress: connection.email_address as string,
  };
}

// Connection-status-only check for the /autonomy page's "Connect Zoho
// Mail" card — no token refresh, just whether a row exists at all.
export async function getZohoConnectionSummary(): Promise<{ connected: boolean; emailAddress?: string }> {
  const admin = await createAdminClient();
  const { data: connection } = await admin
    .from("zoho_connections")
    .select("email_address")
    .limit(1)
    .maybeSingle();

  return connection ? { connected: true, emailAddress: connection.email_address as string } : { connected: false };
}
