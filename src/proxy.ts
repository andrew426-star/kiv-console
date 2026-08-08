import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
const PUBLIC_PATHS = [
  "/login",
  "/api/health",
  "/api/agents/log",
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

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
