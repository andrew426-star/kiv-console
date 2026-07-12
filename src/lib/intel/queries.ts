import { createClient } from "@/lib/supabase/server";
import { getQuotesFor, type Quote } from "@/lib/market/finnhub";

export type WatchlistQuote = Quote & { id: string };

export async function getWatchlist(): Promise<WatchlistQuote[]> {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("watchlist_items")
    .select("id, symbol, label")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!items || items.length === 0) return [];

  const quotes = await getQuotesFor(items.map((i) => ({ symbol: i.symbol, label: i.label })));
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  return items.flatMap((item) => {
    const quote = quoteBySymbol.get(item.symbol);
    return quote ? [{ ...quote, id: item.id }] : [];
  });
}
