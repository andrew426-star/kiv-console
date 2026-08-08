import { NextResponse, type NextRequest } from "next/server";
import { generateSignalsForUniverse } from "@/lib/trading/signals/generate";

// Triggered by a daily GitHub Actions cron (see
// .github/workflows/trading-scan.yml). No Supabase session exists for
// that caller, so auth is a shared bearer token instead — see PUBLIC_PATHS
// in proxy.ts, same pattern as /api/ale/batch.
export async function POST(request: NextRequest) {
  const apiKey = process.env.TRADING_SCAN_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "TRADING_SCAN_API_KEY is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await generateSignalsForUniverse();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Signal scan failed" }, { status: 500 });
  }
}
