// Thin wrapper around the Slack Web API — no SDK, matches the rest of this
// codebase's pattern of plain fetch calls for external APIs.

export async function postSlackMessage(
  botToken: string,
  { channel, text, threadTs }: { channel: string; text: string; threadTs?: string },
): Promise<void> {
  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({ channel, text, thread_ts: threadTs }),
  });

  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!data.ok) {
    throw new Error(`Slack chat.postMessage failed: ${data.error ?? "unknown error"}`);
  }
}

// Used to tell "this bot's own past messages" (-> model turns) apart from
// everyone else's (-> user turns) when rebuilding thread history.
export async function getSlackBotUserId(botToken: string): Promise<string> {
  const res = await fetch("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const data = (await res.json()) as { ok: boolean; user_id?: string; error?: string };
  if (!data.ok || !data.user_id) {
    throw new Error(`Slack auth.test failed: ${data.error ?? "unknown error"}`);
  }
  return data.user_id;
}

// Used to recognize whether a bot-authored Slack event came from a specific
// known bot (e.g. Jarvis) — bot_id is stable per app installation and always
// present on bot-authored message events, unlike `user`, which Slack doesn't
// reliably populate there.
export async function getSlackBotId(botToken: string): Promise<string> {
  const res = await fetch("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const data = (await res.json()) as { ok: boolean; bot_id?: string; error?: string };
  if (!data.ok || !data.bot_id) {
    throw new Error(`Slack auth.test failed: ${data.error ?? "unknown error"}`);
  }
  return data.bot_id;
}

export type SlackThreadMessage = {
  ts: string;
  text?: string;
  user?: string;
  bot_id?: string;
};

export async function getThreadReplies(
  botToken: string,
  channel: string,
  threadTs: string,
): Promise<SlackThreadMessage[]> {
  const params = new URLSearchParams({ channel, ts: threadTs, limit: "50" });
  const res = await fetch(`https://slack.com/api/conversations.replies?${params.toString()}`, {
    headers: { Authorization: `Bearer ${botToken}` },
  });
  const data = (await res.json()) as { ok: boolean; messages?: SlackThreadMessage[]; error?: string };
  if (!data.ok) {
    throw new Error(`Slack conversations.replies failed: ${data.error ?? "unknown error"}`);
  }
  return data.messages ?? [];
}
