import type { GeminiContent } from "@/lib/ai/gemini";
import { getSlackBotUserId, getThreadReplies } from "./web-api";

// Rebuilds a thread's prior messages as Gemini conversation turns, so a
// follow-up @mention in an existing thread actually has memory of what was
// said before — previously every mention started a brand-new, contextless
// conversation. `excludeTs` is the message that triggered the current
// reply (already becomes the final turn separately, not part of history).
export async function buildThreadHistory(
  botToken: string,
  channel: string,
  threadTs: string,
  excludeTs: string,
): Promise<GeminiContent[]> {
  const [myUserId, messages] = await Promise.all([
    getSlackBotUserId(botToken),
    getThreadReplies(botToken, channel, threadTs),
  ]);

  return messages
    .filter((m) => m.ts !== excludeTs && m.text)
    .map((m): GeminiContent => {
      if (m.user === myUserId) {
        return { role: "model", parts: [{ text: m.text! }] };
      }
      // Prefixed so cross-talk (Andrew vs. a different agent posting in
      // the same thread) stays distinguishable to the model.
      const speaker = m.bot_id ? "Another agent" : "Andrew";
      return { role: "user", parts: [{ text: `${speaker}: ${m.text}` }] };
    });
}
