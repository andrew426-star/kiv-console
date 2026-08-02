import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens, resolveZohoAccount } from "@/lib/zoho/oauth";
import { getPublicOrigin } from "@/lib/origin";

export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(new URL("/autonomy?error=missing_code", origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // state carries the user id that initiated the flow, so a callback can't
  // be replayed against a different signed-in session.
  if (!user || user.id !== state) {
    return NextResponse.redirect(new URL("/autonomy?error=session_mismatch", origin));
  }

  const redirectUri = new URL("/api/auth/zoho/callback", origin).toString();

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/autonomy?error=no_refresh_token", origin));
    }

    const { accountId, emailAddress } = await resolveZohoAccount(tokens.access_token);

    const admin = createAdminClient();
    const { error } = await admin.from("zoho_connections").upsert({
      profile_id: user.id,
      email_address: emailAddress,
      account_id: accountId,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });
    if (error) throw error;

    return NextResponse.redirect(new URL("/autonomy", origin));
  } catch (err) {
    console.error("Zoho OAuth callback failed", err);
    return NextResponse.redirect(new URL("/autonomy?error=exchange_failed", origin));
  }
}
