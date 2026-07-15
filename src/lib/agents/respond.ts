import { generateContent, textPart, functionCallParts, type GeminiContent } from "@/lib/ai/gemini";
import { findAgent } from "./roster";
import { getToolsForAgent, dispatchTool } from "./tool-definitions";

const READ_ONLY_ADVISORY_AGENTS = new Set(["ledger", "ticker", "oracle"]);

function buildSystemPrompt(agentId: string): string {
  const found = findAgent(agentId);
  if (!found) throw new Error(`Unknown agentId: ${agentId}`);
  const { agent, division } = found;

  const readOnlyNote = READ_ONLY_ADVISORY_AGENTS.has(agentId)
    ? `\n\nYour access to Stripe and/or Alpaca data is strictly read-only, view-and-advise — there is no tool that can execute a charge, refund, payout, trade, or transfer. If asked to actually do one of those, say plainly that you can only view and advise, not execute.`
    : "";

  return `You are ${agent.name}, the ${agent.role} on Kivaro AI's ${division.label} division.

${agent.description}${readOnlyNote}

You're replying inside Slack, so:
- Use Slack's mrkdwn, not standard markdown: *bold* (single asterisk), _italic_, \`code\`, and <https://url|link text> for links. Never use "**bold**" or "[text](url)".
- Keep replies tight — a Slack message, not an email. A few sentences or a short list, not a wall of text.
- Only use a tool if it actually helps answer what was asked — don't call one just because it's available.
- If someone asks about something you don't have a real tool or data source for, say so plainly rather than inventing an answer. You are a real, currently-limited agent — not a demo pretending to have capabilities you don't.`;
}

const MAX_ITERATIONS = 4;

export async function generateAgentReply(agentId: string, incomingText: string): Promise<string> {
  const found = findAgent(agentId);
  if (!found) throw new Error(`Unknown agentId: ${agentId}`);

  const tools = getToolsForAgent(agentId);
  const contents: GeminiContent[] = [{ role: "user", parts: [{ text: incomingText }] }];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const { parts, finishReason } = await generateContent({
      systemInstruction: buildSystemPrompt(agentId),
      contents,
      tools: tools.length > 0 ? tools : undefined,
      maxOutputTokens: 1024,
    });

    if (finishReason === "SAFETY" || finishReason === "RECITATION") {
      throw new Error("Gemini declined to respond to this message");
    }

    const calls = functionCallParts(parts);
    if (calls.length === 0) {
      const text = textPart(parts);
      if (!text) throw new Error("Gemini returned no text content");
      return text;
    }

    // Append the model's own function-call turn, then execute each tool
    // and feed the results back as the next turn.
    contents.push({ role: "model", parts: calls });

    const responseParts = await Promise.all(
      calls.map(async (call) => ({
        functionResponse: {
          name: call.functionCall.name,
          response: { result: await dispatchTool(call.functionCall.name, call.functionCall.args) },
        },
      })),
    );
    contents.push({ role: "user", parts: responseParts });
  }

  throw new Error("Agent hit max tool-call iterations without a final reply");
}
