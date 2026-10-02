import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAllowedEmail } from "@/lib/auth/allowlist";

// /api/agents/log is called by external agent backends (Slack bot, Jarvis,
// etc.) with no Supabase session — it enforces its own bearer-token check.
// /api/slack/events/[agentId] is Slack's own webhook delivery, likewise no
// session — it enforces Slack's HMAC request signature instead.
// /api/ale/batch is the weekday-batch GitHub Actions cron, same bearer-token
// pattern as /api/agents/log.
// /api/jarvis/notify is Jarvis's own backend calling in to DM an agent —
// same bearer-token pattern as /api/agents/log.
// /api/trading is the daily signal scan + weekly backtest GitHub Actions
// cron jobs, same bearer-token pattern as /api/ale/batch.
// /manifest.webmanifest is fetched by the browser itself to install the
// app, with no session to show.
// /auth/callback is where Google sign-in returns, before there is a
// session to show.
const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/manifest.webmanifest",
  "/api/health",
  "/api/agents/log",
  "/api/agents/jobs",
  "/api/slack/events",
  "/api/ale/batch",
  "/api/ale/outreach-drip",
  "/api/jarvis",
  "/api/trading",
];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  // A session only counts for an allowlisted account. /auth/callback signs
  // anyone else straight back out; this is the backstop for a session that
  // got past it, or one from before an address was taken off the list.
  if (user && !isAllowedEmail(user.email) && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?error=${encodeURIComponent("That account is not authorised for K.I.V.")}`;
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAllowedEmail(user.email) && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
