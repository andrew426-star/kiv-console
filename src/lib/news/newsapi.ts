import { cacheLife, cacheTag } from "next/cache";

export type NewsArticle = {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
};

const QUERY = "hedge fund OR fintech OR AI automation OR alternative investment";

export async function getNewsFeed(): Promise<NewsArticle[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("news-feed");

  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    q: QUERY,
    language: "en",
    sortBy: "publishedAt",
    pageSize: "8",
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
