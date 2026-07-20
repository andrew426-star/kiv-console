import { NextResponse, type NextRequest } from "next/server";
import { findAgent } from "@/lib/agents/roster";
import { getSlackCredentials } from "@/lib/slack/credentials";
import { getSlackBotUserId, openDirectMessage, postSlackMessage } from "@/lib/slack/web-api";
import { logAgentActivity } from "@/lib/agents/log";

type NotifyPayload = { agentId?: unknown; message?: unknown };

// Jarvis (Andrew's separate personal assistant app) calls this to DM a
// specific K.I.V. agent directly in Slack — same bearer-token pattern as
// /api/agents/log, see PUBLIC_PATHS in proxy.ts. The target must be a real
// roster agent (this is who gets DMed, distinct from the "jarvis" pseudo-id
// used for logging Jarvis's own actions).
export async function POST(request: NextRequest) {
  const apiKey = process.env.AGENT_LOG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AGENT_LOG_API_KEY is not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jarvisToken = process.env.SLACK_BOT_TOKEN_JARVIS;
  if (!jarvisToken) {
    return NextResponse.json({ error: "SLACK_BOT_TOKEN_JARVIS is not configured" }, { status: 503 });
  }

  let body: NotifyPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agentId, message } = body;
  const target = typeof agentId === "string" ? findAgent(agentId) : null;
  if (!target) {
    return NextResponse.json({ error: `Unknown agentId: ${String(agentId)}` }, { status: 400 });
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const targetCredentials = getSlackCredentials(agentId as string);
  if (!targetCredentials) {
    return NextResponse.json(
      { error: `No Slack credentials configured for agent: ${agentId}` },
      { status: 503 },
    );
  }

  try {
    const targetUserId = await getSlackBotUserId(targetCredentials.botToken);
    const dmChannel = await openDirectMessage(jarvisToken, targetUserId);
    await postSlackMessage(jarvisToken, { channel: dmChannel, text: message });
    const data = await logAgentActivity({
      agentId: "jarvis",
      action: "Sent Slack DM",
      detail: `To ${target.agent.name}: ${message.slice(0, 200)}`,
      status: "success",
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    await logAgentActivity({
      agentId: "jarvis",
      action: "Failed to send Slack DM",
      detail,
      status: "error",
    }).catch(() => {});
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
