import { NextResponse, type NextRequest } from "next/server";
import { runWeekdayBatch } from "@/lib/ale/batch";

// Triggered by a weekday-only GitHub Actions cron (see
// .github/workflows/ale-weekday-batch.yml). No Supabase session exists for
// that caller, so auth is a shared bearer token instead — see PUBLIC_PATHS
// in proxy.ts, same pattern as /api/agents/log.
export async function POST(request: NextRequest) {
  const apiKey = process.env.ALE_BATCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ALE_BATCH_API_KEY is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWeekdayBatch();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Batch run failed" },
      { status: 500 },
    );
  }
}
