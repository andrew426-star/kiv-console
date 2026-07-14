import { cacheLife, cacheTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchArticles, type NewsArticle } from "./newsapi";

export type ClientNewsFeed = {
  clientId: string;
  clientName: string;
  articles: NewsArticle[];
};

// Cached per client name (a plain string, safe to cross into `use cache`) —
// the caller resolves which clients exist via a dynamic Supabase query
// first, then passes just the name in here.
async function getNewsForClient(clientName: string): Promise<NewsArticle[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`client-news-${clientName}`);
  return fetchArticles(`"${clientName}"`, 5);
}

// Company Dashboard's client media-coverage feed — confirmed clients only
// (status = 'active'), tracking their publicity once they're a real
// engagement. Not useful with zero clients today, but that's the point:
// it's ready for when the first one lands.
export async function getClientNewsFeeds(): Promise<ClientNewsFeed[]> {
  const supabase = await createClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("status", "active");
  if (error) throw error;
  if (!clients || clients.length === 0) return [];

  return Promise.all(
    clients.map(async (c) => ({
      clientId: c.id as string,
      clientName: c.name as string,
      articles: await getNewsForClient(c.name as string),
    })),
  );
}
