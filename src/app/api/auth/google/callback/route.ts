import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SCHOOL_STATE_PREFIX,
  exchangeCodeForTokens,
  fetchGoogleUserEmail,
} from "@/lib/calendar/google";
import { getPublicOrigin } from "@/lib/origin";

export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  // Google reports a declined or admin-blocked consent (a school Workspace
  // that restricts third-party apps, say) as ?error= with no code — pass
  // its reason through instead of a generic missing_code.
  const oauthError = request.nextUrl.searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/calendar?error=${encodeURIComponent(oauthError)}`, origin),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/calendar?error=missing_code", origin));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // state carries the user id that initiated the flow, so a callback can't
  // be replayed against a different signed-in session. A "school:" prefix
  // marks the read-only Louisiana Tech connect.
  const isSchool = state.startsWith(SCHOOL_STATE_PREFIX);
  const stateUserId = isSchool ? state.slice(SCHOOL_STATE_PREFIX.length) : state;
  if (!user || user.id !== stateUserId) {
    return NextResponse.redirect(new URL("/calendar?error=session_mismatch", origin));
  }

  const redirectUri = new URL("/api/auth/google/callback", origin).toString();

  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(new URL("/calendar?error=no_refresh_token", origin));
    }

    const email = await fetchGoogleUserEmail(tokens.access_token);

    const tokenFields = {
      profile_id: user.id,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      access_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    };

    const admin = await createAdminClient();
    const { error } = isSchool
      ? await admin.from("school_google_connections").upsert({ ...tokenFields, email })
      : await admin.from("calendar_connections").upsert({ ...tokenFields, calendar_email: email });
    if (error) throw error;

    return NextResponse.redirect(new URL("/calendar", origin));
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    return NextResponse.redirect(new URL("/calendar?error=exchange_failed", origin));
  }
}
