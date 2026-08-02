import { generateWithToolLoop, type GeminiContent } from "@/lib/ai/gemini";
import { findAgent } from "./roster";
import { getToolsForAgent, dispatchTool } from "./tool-definitions";
import { KIVARO_BRAND_PALETTE, CREATIVE_BRAND_AGENTS } from "./brand-palette";

const READ_ONLY_ADVISORY_AGENTS = new Set(["ledger", "ticker", "oracle"]);

function buildSystemPrompt(agentId: string): string {
  const found = findAgent(agentId);
  if (!found) throw new Error(`Unknown agentId: ${agentId}`);
  const { agent, division } = found;

  const readOnlyNote = READ_ONLY_ADVISORY_AGENTS.has(agentId)
    ? `\n\nYour access to Stripe and/or Alpaca data is strictly read-only, view-and-advise — there is no tool that can execute a charge, refund, payout, trade, or transfer. If asked to actually do one of those, say plainly that you can only view and advise, not execute.`
    : "";

  const forgeNote =
    agentId === "forge"
      ? `\n\nYou plan, design, and advise on workflows/agents/features — for K.I.V. itself and for client-facing showcase builds — working alongside Andrew and Claude in real development sessions, the same way a second developer would. Your one real, concrete action is opening a GitHub issue in the kiv-console repo to formally propose and track something to build. You do not write, commit, or deploy code yourself — say so plainly if asked to.`
      : "";

  const brandNote = CREATIVE_BRAND_AGENTS.has(agentId) ? `\n\n${KIVARO_BRAND_PALETTE}` : "";

  const pipelineNote =
    agentId === "pipeline"
      ? `\n\nYour send_outreach_email tool is real, live, and irreversible — it sends an actual email from andrew.thomas@kivaroai.com to a real contact and cannot be unsent. It always sends that company's already-drafted Outreach Email exactly as written (only the subject line and signature are mechanically split out, never reworded or regenerated) — you are not composing new outreach copy at send time. When a request could plausibly mean more than one company, name the specific company you're about to email in your reply and ask for clarification rather than guessing or sending to several at once. If the tool comes back already_sent, no_draft_email, no_contact_email, rate_limited, or any *_not_connected status, report that plainly as what it is — never reframe a non-send as if the email went out.`
      : "";

  return `You are ${agent.name}, the ${agent.role} on Kivaro AI's ${division.label} division.

${agent.description}${readOnlyNote}${forgeNote}${pipelineNote}${brandNote}

You're replying inside Slack, so:
- Use Slack's mrkdwn, not standard markdown: *bold* (single asterisk), _italic_, \`code\`, and <https://url|link text> for links. Never use "**bold**" or "[text](url)".
- Keep replies tight — a Slack message, not an email. A few sentences or a short list, not a wall of text.
- Only use a tool if it actually helps answer what was asked — don't call one just because it's available.
- If someone asks about something you don't have a real tool or data source for, say so plainly rather than inventing an answer. You are a real, currently-limited agent — not a demo pretending to have capabilities you don't.
- If this is a reply within an ongoing thread, you'll see the earlier messages first — treat it as a continuing conversation (e.g. "yes" or "go with that" refers back to what you just said), not a fresh request. Prior user-role turns prefixed "Andrew:" or "Another agent:" tell you who actually said them.`;
}

export async function generateAgentReply(
  agentId: string,
  incomingText: string,
  history: GeminiContent[] = [],
): Promise<string> {
  const found = findAgent(agentId);
  if (!found) throw new Error(`Unknown agentId: ${agentId}`);

  const tools = getToolsForAgent(agentId);

  return generateWithToolLoop({
    systemInstruction: buildSystemPrompt(agentId),
    history,
    initialPrompt: incomingText,
    tools: tools.length > 0 ? tools : undefined,
    dispatch: dispatchTool,
    maxOutputTokens: 1024,
    maxIterations: 4,
  });
}
