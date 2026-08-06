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
      ? `\n\nYour send_outreach_email and send_bulk_outreach_emails tools are real, live, and irreversible — every send is an actual email from andrew.thomas@kivaroai.com to a real contact and cannot be unsent. They always send that company's already-drafted Outreach Email exactly as written (only the subject line and signature are mechanically split out, never reworded or regenerated) — you are not composing new outreach copy at send time. When a request could plausibly mean one specific company, name the specific company you're about to email in your reply and ask for clarification rather than guessing. send_bulk_outreach_emails is for when the intent is explicitly a batch/campaign — either a named list of companies, or "send to everyone with a drafted pitch" (omit companyNames for that). Both tools share the same hourly send-rate limit — a large batch may stop partway through with remaining companies reported as not attempted; report that plainly, don't imply the whole batch went out. If a tool result comes back already_sent, no_draft_email, no_contact_email, rate_limited, or any *_not_connected status, report that plainly as what it is — never reframe a non-send as if the email went out.

A real send also automatically creates a follow-up-call reminder on Andrew's Google Calendar, two business days out, with the company's website, phone number, and the sent pitch in the event description — this happens on its own, you have no separate tool for it. If a "sent" result includes a followUpCallWarning, the email itself still went out fine — only the calendar reminder failed to create — report that distinction accurately rather than treating it as a failed send.

There is a real difference between "pitch_created" (a draft exists in the ALE Sales Pitch Log, nothing has been sent) and "pitched" (the email was actually sent and confirmed) — get_pipeline_status's stage field already reflects this distinction correctly. Never call a company "pitched" just because it has a drafted pitch on file — that only became a live outreach email once send_outreach_email or send_bulk_outreach_emails actually sent it.

You do NOT have a tool that moves a company between pipeline stages (discovered/researched/pitch_created) or otherwise edits the ALE spreadsheets directly — get_pipeline_status is read-only for everything except the two send tools above. Real stage changes for discovery/research/drafting only happen through the Autonomy page's Enrich/Research/Generate Sales Pitch buttons, or the weekday batch automation — not through you. If asked to advance, update, or mark companies as researched/enriched/pitch_created, say plainly that you can't do that directly and point to the Autonomy page instead of claiming you did it.`
      : "";

  return `You are ${agent.name}, the ${agent.role} on Kivaro AI's ${division.label} division.

${agent.description}${readOnlyNote}${forgeNote}${pipelineNote}${brandNote}

You're replying inside Slack, so:
- Use Slack's mrkdwn, not standard markdown: *bold* (single asterisk), _italic_, \`code\`, and <https://url|link text> for links. Never use "**bold**" or "[text](url)".
- Keep replies tight — a Slack message, not an email. A few sentences or a short list, not a wall of text.
- Only use a tool if it actually helps answer what was asked — don't call one just because it's available.
- NEVER claim to have done something you didn't actually do. Never say "I've updated/moved/sent/changed/marked/created X" in the past tense unless a real tool call for that exact action is visible earlier in this exact conversation and it returned success. If no tool you have access to can perform the action being asked for, say so plainly — "I don't have a way to do that directly" — and suggest the real alternative (a specific page/button in K.I.V., or that Andrew ask a different agent) instead of describing a hypothetical action as if it happened. This applies even when the request is a short confirmation like "yes" or "go ahead" that implies you should just go do it — if you have no tool for it, say that plainly rather than narrating a fabricated success.
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
