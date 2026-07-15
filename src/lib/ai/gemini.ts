// Shared Gemini REST client — used by the Research brief (single-turn, no
// tools) and the Slack agents (multi-turn, tool-calling loop lives in
// src/lib/agents/respond.ts). Plain fetch, matching this codebase's
// convention for every other external API (no vendor SDK).
//
// Model/API shape verified directly against the official @google/genai SDK
// type definitions and REST reference before writing this — Gemini's
// request/response field casing (camelCase) and the Type enum's uppercase
// values (OBJECT/STRING/ARRAY) are easy to get subtly wrong by guessing.

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
// gemini-3.5-flash's free-tier quota measured at just 5 RPM / 20 requests
// per DAY on this account — unusable for 15 live Slack agents. Flash-Lite
// measured at 15 RPM with no immediate daily wall in the same testing;
// this task doesn't need flagship-tier reasoning anyway.
export const GEMINI_MODEL = "gemini-3.1-flash-lite";

export type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

export type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

export type GeminiFunctionDeclaration = {
  name: string;
  description: string;
  parameters?: {
    type: "OBJECT";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

// The stable generateContent API can't mix googleSearch with custom
// functionDeclarations in one request — that combination is Preview-only
// and Gemini-3-specific via a separate "Interactions API" this doesn't use.
// Callers pick one or the other per agent (see agents/tool-definitions.ts).
export type GeminiTool =
  | { functionDeclarations: GeminiFunctionDeclaration[] }
  | { googleSearch: Record<string, never> };

export type GeminiFinishReason =
  | "STOP"
  | "MAX_TOKENS"
  | "SAFETY"
  | "RECITATION"
  | "LANGUAGE"
  | "OTHER"
  | string;

export function textPart(parts: GeminiPart[]): string | undefined {
  return parts.find((p): p is { text: string } => "text" in p)?.text;
}

export function functionCallParts(
  parts: GeminiPart[],
): Array<{ functionCall: { name: string; args: Record<string, unknown> } }> {
  return parts.filter(
    (p): p is { functionCall: { name: string; args: Record<string, unknown> } } =>
      "functionCall" in p,
  );
}

export async function generateContent(params: {
  systemInstruction?: string;
  contents: GeminiContent[];
  tools?: GeminiTool[];
  maxOutputTokens?: number;
}): Promise<{ parts: GeminiPart[]; finishReason: GeminiFinishReason | undefined }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const res = await fetch(`${GEMINI_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: params.contents,
      ...(params.systemInstruction
        ? { systemInstruction: { parts: [{ text: params.systemInstruction }] } }
        : {}),
      ...(params.tools ? { tools: params.tools } : {}),
      generationConfig: { maxOutputTokens: params.maxOutputTokens ?? 1024 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini request failed: ${await res.text()}`);

  const data = (await res.json()) as {
    candidates?: Array<{ content?: GeminiContent; finishReason?: string }>;
  };
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error("Gemini returned no candidates");

  return { parts: candidate.content?.parts ?? [], finishReason: candidate.finishReason };
}
