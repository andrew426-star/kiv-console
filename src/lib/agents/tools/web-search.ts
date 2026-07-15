const TAVILY_BASE = "https://api.tavily.com";

export type WebSearchResult = { title: string; url: string; content: string };

// Tavily instead of Gemini's built-in googleSearch grounding — the latter
// requires billing enabled even on an otherwise-free Gemini project (409'd
// in testing: "check your plan and billing"). Tavily is purpose-built for
// LLM/agent search, genuinely free (1,000 searches/month, no card).
export async function webSearch(query: string): Promise<WebSearchResult[]> {
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
