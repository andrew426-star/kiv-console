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
