import { cacheLife, cacheTag } from "next/cache";

export type NewsArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

// Distinguishes "NEWSAPI_KEY genuinely unset" from "configured but a fetch
// came back empty" (e.g. NewsAPI's free tier rate limit: 100 req/24h) —
// the two used to look identical to the UI, which showed "Not connected"
// even with a valid key just because a call happened to fail.
export function isNewsApiConfigured(): boolean {
  return Boolean(process.env.NEWSAPI_KEY);
}

// Exported (not just used internally) so other consumers — e.g. the
// Company Dashboard's per-client news, keyed on a client name rather than
// a fixed category — can run their own ad-hoc query through the same
// NewsAPI plumbing without duplicating it.
export async function fetchArticles(query: string, pageSize: number): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: query,
    language: "en",
    sortBy: "publishedAt",
    pageSize: String(pageSize),
    apiKey,
  });

  const res = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    articles?: Array<{ title: string; url: string; source: { name: string }; publishedAt: string }>;
  };

  return (data.articles ?? []).map((a) => ({
    title: a.title,
    url: a.url,
    source: a.source.name,
    publishedAt: a.publishedAt,
  }));
}

// NewsAPI's free Developer plan caps out at 100 requests/24h (50 per 12h)
// — shared across every consumer of these cached functions, not per-page.
// With 7 fixed query slots (this one + the 6 Intel Hub categories below)
// plus one per active client, "minutes"-lifetime caching burned through the
// whole daily quota fast (confirmed: a live call returned NewsAPI's
// rateLimited error). ~4hr revalidate keeps every slot's daily request
// count low and predictable regardless of how many pages/agents hit it.
export const NEWS_CACHE_LIFE = { stale: 3600, revalidate: 14400, expire: 86400 } as const;

const QUERY = "hedge fund OR fintech OR AI automation OR alternative investment";

// General-purpose single feed — used by the Overview/Company pages, agent
// tools, and the Research brief. Kept separate from the Intel Hub's
// per-category feeds below, which those consumers don't need.
export async function getNewsFeed(): Promise<NewsArticle[]> {
  "use cache";
  cacheLife(NEWS_CACHE_LIFE);
  cacheTag("news-feed");
  return fetchArticles(QUERY, 8);
}

// Intel Hub's categorized feeds. Real NewsAPI search terms per category —
// "AI Assimilation in Finance" is Andrew's label for the tab, but NewsAPI
// needs the terms reporters actually use, not that phrase verbatim.
export const NEWS_CATEGORIES = [
  { id: "fintech", label: "Financial Tech", query: '"fintech" OR "financial technology"' },
  { id: "ai-automation", label: "AI Automation", query: '"AI automation" OR "intelligent automation"' },
  { id: "llms", label: "LLMs", query: '"large language model" OR LLM OR "generative AI"' },
  { id: "hedge-funds", label: "Hedge Funds", query: '"hedge fund"' },
  { id: "private-equity", label: "Private Equity", query: '"private equity"' },
  {
    id: "ai-finance",
    label: "AI Assimilation in Finance",
    query:
      '("AI adoption" AND (finance OR banking)) OR ("artificial intelligence" AND "financial services")',
  },
] as const satisfies readonly { id: string; label: string; query: string }[];

export type NewsCategoryId = (typeof NEWS_CATEGORIES)[number]["id"];

export async function getNewsByCategory(categoryId: NewsCategoryId): Promise<NewsArticle[]> {
  "use cache";
  cacheLife(NEWS_CACHE_LIFE);
  cacheTag(`news-feed-${categoryId}`);

  const category = NEWS_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];
  return fetchArticles(category.query, 6);
}
