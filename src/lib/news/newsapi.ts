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
// Mainstream outlets only — Andrew's ask, matching what Intel Hub used to
// surface before searchIn/excludeDomains tightened relevance (VentureBeat,
// WSJ, etc.). This is a hard allowlist (NewsAPI's `domains` param), not a
// preference — confirmed live it also fully replaces the pypi.org
// exclusion (none of these domains are package-release feeds) and lifts
// overall result quality further: every article now comes from a
// recognizable outlet instead of blogs/Hacker-News-style posts.
const MAINSTREAM_DOMAINS = [
  "venturebeat.com",
  "wsj.com",
  "bloomberg.com",
  "reuters.com",
  "cnbc.com",
  "techcrunch.com",
  "businessinsider.com",
  "ft.com",
  "forbes.com",
  "fortune.com",
  "axios.com",
  "theverge.com",
  "marketwatch.com",
].join(",");

export async function fetchArticles(query: string, pageSize: number): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: query,
    // Restricts matching to title/description rather than full article
    // body (NewsAPI's default) — confirmed live that the default full-text
    // match was pulling in a lot of noise (celebrity/sports/unrelated
    // stories that happened to mention a query phrase once, deep in the
    // article) that title/description matching cuts out almost entirely.
    searchIn: "title,description",
    domains: MAINSTREAM_DOMAINS,
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

// Curated to what Andrew actually wants K.I.V. watching for: potential
// market moves, AI tools/LLM updates, and shifts in hedge funds, PE, VC,
// or the AI field generally — not a generic fintech/AI grab-bag. Kept as
// concrete phrases NewsAPI's keyword search can actually match, not
// abstract topic labels.
const QUERY =
  '"hedge fund" OR "private equity" OR "venture capital" OR "large language model" OR "generative AI" OR "Federal Reserve" OR "market volatility"';

// General-purpose single feed — used by the Overview/Company pages, agent
// tools, and the Research brief. Kept separate from the Intel Hub's
// per-category feeds below, which those consumers don't need.
export async function getNewsFeed(): Promise<NewsArticle[]> {
  "use cache";
  cacheLife(NEWS_CACHE_LIFE);
  cacheTag("news-feed");
  return fetchArticles(QUERY, 8);
}

// Intel Hub's categorized feeds — one slot per theme Andrew named as
// relevant to Kivaro AI: market-moving signals, AI tools/LLM updates, and
// shifts specifically in hedge funds, private equity, venture capital, and
// the AI field. Replaces the prior fintech/ai-automation/ai-finance mix,
// which skewed generic (consumer fintech, vague "AI adoption") rather than
// the market-moves/VC angle Andrew actually wants surfaced. Still 6 slots
// — not adding to the shared 100-req/24h NewsAPI quota, just refocusing
// what each slot searches for.
export const NEWS_CATEGORIES = [
  {
    id: "market-moves",
    label: "Market-Moving Signals",
    query:
      '"Federal Reserve" OR "interest rate" OR "market selloff" OR "market rally" OR "market volatility" OR recession',
  },
  {
    id: "ai-tools-llms",
    label: "AI Tools & LLM Updates",
    query: '"large language model" OR LLM OR "generative AI" OR "AI model release" OR "AI tool"',
  },
  { id: "hedge-funds", label: "Hedge Fund Shifts", query: '"hedge fund"' },
  { id: "private-equity", label: "Private Equity Shifts", query: '"private equity"' },
  {
    id: "venture-capital",
    label: "Venture Capital & AI Funding",
    // "Series A"/"Series B" dropped — confirmed live they're too ambiguous
    // on their own (matched TV/media "series" and unrelated contexts) even
    // restricted to title/description.
    query: '"venture capital" OR "VC funding" OR "startup funding" OR "AI startup"',
  },
  {
    id: "ai-innovation",
    label: "AI Field Innovation",
    query: '"AI breakthrough" OR "AI research" OR "next-generation AI"',
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
