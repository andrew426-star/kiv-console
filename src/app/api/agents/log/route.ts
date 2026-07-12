import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findAgent } from "@/lib/agents/roster";

const VALID_STATUSES = ["info", "success", "warning", "error"] as const;
type Status = (typeof VALID_STATUSES)[number];

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
  if (status !== undefined && !VALID_STATUSES.includes(status as Status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }
  if (detail !== undefined && typeof detail !== "string") {
    return NextResponse.json({ error: "detail must be a string" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_activity_log")
    .insert({
      agent_id: agentId,
      action: action.trim(),
      detail: detail ?? null,
      status: (status as Status | undefined) ?? "info",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
