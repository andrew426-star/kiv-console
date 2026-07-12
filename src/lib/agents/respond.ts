import Anthropic from "@anthropic-ai/sdk";
import { findAgent } from "./roster";
import { getToolsForAgent } from "./tool-definitions";

const client = new Anthropic();

function buildSystemPrompt(agentId: string): string {
  const found = findAgent(agentId);
  if (!found) throw new Error(`Unknown agentId: ${agentId}`);
  const { agent, division } = found;

  return `You are ${agent.name}, the ${agent.role} on Kivaro AI's ${division.label} division.

${agent.description}

You're replying inside Slack, so:
- Use Slack's mrkdwn, not standard markdown: *bold* (single asterisk), _italic_, \`code\`, and <https://url|link text> for links. Never use "**bold**" or "[text](url)".
- Keep replies tight — a Slack message, not an email. A few sentences or a short list, not a wall of text.
- Only use a tool if it actually helps answer what was asked — don't call one just because it's available.
- If someone asks about something you don't have a real tool or data source for, say so plainly rather than inventing an answer. You are a real, currently-limited agent — not a demo pretending to have capabilities you don't.`;
}

export async function generateAgentReply(agentId: string, incomingText: string): Promise<string> {
  const found = findAgent(agentId);
  if (!found) throw new Error(`Unknown agentId: ${agentId}`);

  const runner = client.beta.messages.toolRunner({
    model: found.agent.model,
    max_tokens: 1024,
    max_iterations: 4,
    system: buildSystemPrompt(agentId),
    tools: getToolsForAgent(agentId),
    messages: [{ role: "user", content: incomingText }],
  });

  const finalMessage = await runner.runUntilDone();

  if (finalMessage.stop_reason === "refusal") {
    throw new Error("Claude declined to respond to this message");
  }

  const text = finalMessage.content.find((block) => block.type === "text")?.text;
  if (!text) throw new Error("Claude returned no text content");
  return text;
}
