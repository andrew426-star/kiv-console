import type { GeminiFunctionDeclaration } from "./gemini";

const TAVILY_BASE = "https://api.tavily.com";

export type WebSearchResult = { title: string; url: string; content: string };

// Tavily instead of Gemini's built-in googleSearch grounding — the latter
// requires billing enabled even on an otherwise-free Gemini project (429'd
// in testing: "check your plan and billing"). Tavily is purpose-built for
// LLM/agent search, genuinely free (1,000 searches/month, no card). Shared
// by the Slack agents (src/lib/agents/tool-definitions.ts) and ALE's
// research/pitch generation (src/lib/ale/*.ts).
export async function webSearch(query: string): Promise<WebSearchResult[]> {
  // Gemini occasionally calls this tool without actually filling in the
  // query arg despite it being marked required — Tavily 400s on an empty
  // query, which used to crash the whole tool loop. Treat it as "no
  // results" instead of a hard failure; generateWithToolLoop also now
  // catches dispatch errors generally, but this avoids the wasted request.
  if (!query.trim()) return [];

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not configured");

  const res = await fetch(`${TAVILY_BASE}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, max_results: 5 }),
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${await res.text()}`);

  const data = (await res.json()) as {
    results?: Array<{ title: string; url: string; content: string }>;
  };
  return (data.results ?? []).map((r) => ({ title: r.title, url: r.url, content: r.content }));
}

export const WEB_SEARCH_DECL: GeminiFunctionDeclaration = {
  name: "web_search",
  description:
    "Search the web for current information. Use for anything requiring up-to-date or external facts you don't already know.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: { type: "STRING", description: "The search query." },
    },
    required: ["query"],
  },
};

// Dispatch helper for a generateWithToolLoop() call whose only tool is
// web_search — extracts the query arg and returns raw results as `unknown`
// (matching the dispatch signature generateWithToolLoop expects).
export async function dispatchWebSearch(args: Record<string, unknown>): Promise<unknown> {
  return webSearch(String(args.query ?? ""));
}
