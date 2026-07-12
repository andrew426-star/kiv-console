import { NextResponse, type NextRequest } from "next/server";
import { findAgent } from "@/lib/agents/roster";
import { logAgentActivity, VALID_STATUSES, type LogStatus } from "@/lib/agents/log";

type LogPayload = {
  agentId?: unknown;
  action?: unknown;
  detail?: unknown;
  status?: unknown;
};

// External agent backends (Slack bot, Jarvis, etc.) call this to record an
// action an agent took. No Supabase session exists for those callers, so
// auth is a shared bearer token instead — see PUBLIC_PATHS in proxy.ts.
export async function POST(request: NextRequest) {
  const apiKey = process.env.AGENT_LOG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AGENT_LOG_API_KEY is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: LogPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agentId, action, detail, status } = body;

  if (typeof agentId !== "string" || !findAgent(agentId)) {
    return NextResponse.json({ error: `Unknown agentId: ${String(agentId)}` }, { status: 400 });
  }
  if (typeof action !== "string" || action.trim().length === 0) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status as LogStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  if (detail !== undefined && typeof detail !== "string") {
    return NextResponse.json({ error: "detail must be a string" }, { status: 400 });
  }

  try {
    const data = await logAgentActivity({
      agentId,
      action,
      detail: detail as string | undefined,
      status: status as LogStatus | undefined,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to log activity" },
      { status: 500 },
    );
  }
}
