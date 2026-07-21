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

// A plain reply within a thread (no fresh @mention) only fires a "message"
// event, not "app_mention" — used to decide whether THIS agent should treat
// that reply as directed at it. Every agent present in the channel gets the
// same event (Slack doesn't scope "message" events to who's relevant), so
// each one has to independently check whether it already has a foothold in
// this specific thread before replying — otherwise a single unmentioned
// reply would make all 15 agents chime in. Fails safe: any lookup error
// means "not a participant," since staying silent is the safer default.
export async function isThreadParticipant(
  botToken: string,
  channel: string,
  threadTs: string,
): Promise<boolean> {
  try {
    const [myUserId, messages] = await Promise.all([
      getSlackBotUserId(botToken),
      getThreadReplies(botToken, channel, threadTs),
    ]);
    return messages.some((m) => m.user === myUserId);
  } catch {
    return false;
  }
}
