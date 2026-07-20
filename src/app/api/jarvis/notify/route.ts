import { NextResponse, type NextRequest } from "next/server";
import { findAgent } from "@/lib/agents/roster";
import { postSlackMessage } from "@/lib/slack/web-api";
import { logAgentActivity } from "@/lib/agents/log";

type NotifyPayload = { agentId?: unknown; message?: unknown };

// Jarvis (Andrew's separate personal assistant app) calls this to notify a
// specific K.I.V. agent in Slack — same bearer-token pattern as
// /api/agents/log, see PUBLIC_PATHS in proxy.ts. The target must be a real
// roster agent (distinct from the "jarvis" pseudo-id used for logging
// Jarvis's own actions).
//
// Slack has no bot-to-bot DM support (conversations.open rejects it with
// cannot_dm_bot, confirmed live) — so instead each agent gets a private
// channel with just Jarvis + that agent's bot as members, created once in
// Slack and pointed to here via SLACK_JARVIS_CHANNEL_<AGENT_ID>.
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

  const channel = process.env[`SLACK_JARVIS_CHANNEL_${(agentId as string).toUpperCase()}`];
  if (!channel) {
    return NextResponse.json(
      { error: `No Jarvis channel configured for agent: ${agentId}` },
      { status: 503 },
    );
  }

  try {
    await postSlackMessage(jarvisToken, { channel, text: message });
    const data = await logAgentActivity({
      agentId: "jarvis",
      action: "Sent Slack message",
      detail: `To ${target.agent.name}: ${message.slice(0, 200)}`,
      status: "success",
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    await logAgentActivity({
      agentId: "jarvis",
      action: "Failed to send Slack message",
      detail,
      status: "error",
    }).catch(() => {});
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
