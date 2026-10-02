import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicOrigin } from "@/lib/origin";
import { isAllowedEmail } from "@/lib/auth/allowlist";

// Google sign-in lands here (by way of Supabase) with a PKCE ?code. The
// code becomes a session cookie, and only then is the account checked
// against the allowlist: someone outside it is signed straight back out.
export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const params = request.nextUrl.searchParams;
  const fail = (message: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, origin));

  // Google or Supabase refused before issuing a code (a cancelled consent
  // screen, or sign-ups switched off for an unknown account).
  const refused = params.get("error_description") ?? params.get("error");
  if (refused) return fail(refused);

  const code = params.get("code");
  if (!code) return fail("Sign-in did not complete. Try again.");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(`Sign-in failed (${error.message}). Try again.`);

  if (!isAllowedEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return fail("That Google account is not authorised for K.I.V.");
  }
  return NextResponse.redirect(new URL("/", origin));
}
