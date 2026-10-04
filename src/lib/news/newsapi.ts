import { cacheLife, cacheTag } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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
// The vetted outlets (Oct 2026): rated for credibility and lean (AllSides,
// Media Bias/Fact Check), kept when at least one rater puts them at center
// or right of it with a factual record of Mostly Factual or better, plus
// non-political trade outlets. The full list, with each outlet's ratings
// and why the dropped ones were dropped (CNBC, Axios, The Verge, Business
// Insider, Forbes, Fox Business, IBD...), is the intel_sources table
// (Jarvis's supabase/migrations/0010). This copy only limits the NewsAPI
// fallback and ad-hoc searches such as a client's news.
const MAINSTREAM_DOMAINS = [
  "reuters.com",
  "wsj.com",
  "ft.com",
  "bloomberg.com",
  "barrons.com",
  "marketwatch.com",
  "economist.com",
  "financialpost.com",
  "fortune.com",
  "washingtonexaminer.com",
  "realclearmarkets.com",
  "pionline.com",
  "institutionalinvestor.com",
  "hedgeweek.com",
  "privateequityinternational.com",
  "pitchbook.com",
  "techcrunch.com",
  "theinformation.com",
  "venturebeat.com",
  "news.crunchbase.com",
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

  // Same class of bug just found and fixed in finnhub.ts: an unbounded
  // fetch inside a "use cache" function can hang the whole cache fill
  // (USE_CACHE_TIMEOUT) if the upstream API goes slow/unresponsive rather
  // than returning a fast error.
  const res = await fetch(`https://newsapi.org/v2/everything?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
  });
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

// The Intel feed: what Jarvis's hourly refresh stored in intel_articles
// (app/services/intel.py), from the vetted outlets via Google News, a few
// per category, headline-matched and mixed across outlets. Jarvis's Intel
// panel reads the same rows, so the two show the same articles. Read with a
// plain service-role client, not createAdminClient(): that one calls
// connection(), which cannot run inside "use cache". Without the env vars
// (a build's prerender) it returns nothing rather than throwing.
export const INTEL_CACHE_LIFE = { stale: 600, revalidate: 900, expire: 3600 } as const;

async function readIntel(category?: string): Promise<NewsArticle[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const supabase = createSupabaseClient(url, key, { auth: { persistSession: false } });
    let query = supabase
      .from("intel_articles")
      .select("title, url, source, published_at")
      .order("published_at", { ascending: false, nullsFirst: false });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((row) => ({
      title: row.title,
      url: row.url,
      source: row.source,
      publishedAt: row.published_at ?? "",
    }));
  } catch {
    return [];
  }
}

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
  cacheLife(INTEL_CACHE_LIFE);
  cacheTag("news-feed");
  // The newest across every Intel category, one copy of each story.
  const seen = new Set<string>();
  const intel = (await readIntel())
    .filter((a) => (seen.has(a.url) ? false : (seen.add(a.url), true)))
    .slice(0, 8);
  return intel.length > 0 ? intel : fetchArticles(QUERY, 8);
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
  cacheLife(INTEL_CACHE_LIFE);
  cacheTag(`news-feed-${categoryId}`);

  const category = NEWS_CATEGORIES.find((c) => c.id === categoryId);
  if (!category) return [];
  const intel = await readIntel(categoryId);
  // NewsAPI on the vetted list only if the Intel feed has nothing yet.
  return intel.length > 0 ? intel : fetchArticles(category.query, 6);
}
