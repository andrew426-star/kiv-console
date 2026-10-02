import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPublicOrigin } from "@/lib/origin";

// Where Supabase's emailed links land (password recovery, for now). Two
// shapes arrive here:
//   ?code=...                    a reset started from /forgot-password (PKCE;
//                                its verifier cookie is in this browser)
//   ?token_hash=...&type=...     an email template pointed straight here,
//                                which works in any browser
// Either way the result is a session cookie, then a redirect to `next`.
export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next"));
  const supabase = await createClient();

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  let failure: string | null = "missing token";
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failure = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    failure = error?.message ?? null;
  }

  if (failure) {
    const message = `That link didn't work (${failure}). Request a new one.`;
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}

// Only paths on this site: an open redirect here would turn a Kivaro
// email link into a phishing hop.
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
