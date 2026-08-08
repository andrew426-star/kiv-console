import { NextResponse, type NextRequest } from "next/server";
import { runOutreachDrip } from "@/lib/ale/outreach-drip";

// Triggered by an hourly weekday GitHub Actions cron (see
// .github/workflows/ale-outreach-drip.yml). This is the "resume after the
// rate limit resets" half of mass outreach: sendBulkOutreachEmailsForAgent()
// queues whatever the current hour couldn't take, and each run of this
// drains a few more off that queue.
//
// No Supabase session exists for that caller, so auth is the same shared
// bearer token as /api/ale/batch — see PUBLIC_PATHS in proxy.ts.
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
    const result = await runOutreachDrip();
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Outreach drip run failed" },
      { status: 500 },
    );
  }
}
