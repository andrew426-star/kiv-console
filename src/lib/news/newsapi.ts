import { cacheLife, cacheTag } from "next/cache";

export type NewsArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

async function fetchArticles(query: string, pageSize: number): Promise<NewsArticle[]> {
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

const QUERY = "hedge fund OR fintech OR AI automation OR alternative investment";

// General-purpose single feed — used by the Overview/Company pages, agent
// tools, and the Research brief. Kept separate from the Intel Hub's
// per-category feeds below, which those consumers don't need.
export async function getNewsFeed(): Promise<NewsArticle[]> {
  "use cache";
  cacheLife("minutes");
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
  cacheLife("minutes");
  cacheTag(`news-feed-${categoryId}`);

  const category = NEWS_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];
  return fetchArticles(category.query, 6);
}
