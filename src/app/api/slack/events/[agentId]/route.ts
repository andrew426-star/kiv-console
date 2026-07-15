import { NextResponse, type NextRequest } from "next/server";
import { after } from "next/server";
import { getSlackCredentials } from "@/lib/slack/credentials";
import { verifySlackSignature } from "@/lib/slack/verify";
import { postSlackMessage } from "@/lib/slack/web-api";
import { generateAgentReply } from "@/lib/agents/respond";
import { logAgentActivity } from "@/lib/agents/log";
import { findAgent } from "@/lib/agents/roster";

type SlackEventPayload = {
  type: string;
  challenge?: string;
  event?: {
    type: string;
    text?: string;
    channel?: string;
    channel_type?: string;
    bot_id?: string;
    thread_ts?: string;
    ts?: string;
  };
};

// One dynamic route serves all 15 agents — each Slack app's Event
// Subscriptions Request URL points at /api/slack/events/<agent-id>, and
// this route looks up that agent's own bot token + signing secret. No
// Supabase session exists here (see PUBLIC_PATHS in proxy.ts); auth is
// Slack's own HMAC request signature instead.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;

  if (!findAgent(agentId)) {
    return NextResponse.json({ error: `Unknown agent: ${agentId}` }, { status: 404 });
  }

  const credentials = getSlackCredentials(agentId);
  if (!credentials) {
    return NextResponse.json(
      { error: `No credentials configured for agent: ${agentId}` },
      { status: 503 },
    );
  }

  // Signature verification needs the exact raw bytes Slack signed — must
  // read as text before any JSON parsing.
  const rawBody = await request.text();

  const verified = verifySlackSignature({
    signingSecret: credentials.signingSecret,
    timestampHeader: request.headers.get("x-slack-request-timestamp"),
    signatureHeader: request.headers.get("x-slack-signature"),
    rawBody,
  });
  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SlackEventPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // One-time handshake Slack sends when you first set the Request URL.
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // We ack almost immediately below, so a retry means the first ack was
  // lost in transit, not that anything actually failed — don't reprocess
  // (and re-post) a reply for it.
  if (request.headers.get("x-slack-retry-num")) {
    return NextResponse.json({ ok: true });
  }

  const event = payload.event;
  const isMention = event?.type === "app_mention";
  // channel_type "im" is required here — without it, a plain "message"
  // event fires for every bot present in a channel for every message sent
  // there (not just DMs), which made all 15 agents reply to one @mention.
  const isDirectMessage =
    event?.type === "message" && event.channel_type === "im" && !event.bot_id;

  if (
    payload.type === "event_callback" &&
    (isMention || isDirectMessage) &&
    event?.text &&
    event.channel
  ) {
    const channel = event.channel;
    const text = event.text;
    // Only thread the reply if the triggering message was already inside a
    // thread — a fresh mention should post as a normal channel message, not
    // start a thread.
    const threadTs = event.thread_ts;

    // Slack requires a 200 within ~3s or it retries delivery; a tool-using
    // Gemini call routinely takes longer than that. Ack now, do the real
    // work after the response is sent.
    after(async () => {
      try {
        const reply = await generateAgentReply(agentId, text);
        await postSlackMessage(credentials.botToken, { channel, text: reply, threadTs });
        await logAgentActivity({
          agentId,
          action: "Replied in Slack",
          detail: text.slice(0, 200),
          status: "success",
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`Slack reply failed for ${agentId}`, err);
        await logAgentActivity({
          agentId,
          action: "Failed to reply in Slack",
          detail: message,
          status: "error",
        }).catch(() => {});
      }
    });
  }

  return NextResponse.json({ ok: true });
}
