import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotesFor, type Quote } from "@/lib/market/finnhub";

// Admin-scoped mirror of getWatchlist() (src/lib/intel/queries.ts) — Slack
// tool calls have no Supabase session/cookies to bind a session-scoped
// client to, so this bypasses RLS via the service-role key instead.
export async function getWatchlistForAgent(): Promise<Quote[]> {
  const admin = await createAdminClient();
  const { data: items, error } = await admin
    .from("watchlist_items")
    .select("id, symbol, label")
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!items || items.length === 0) return [];

  const quotes = await getQuotesFor(items.map((i) => ({ symbol: i.symbol, label: i.label })));
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  return items.flatMap((item) => {
    const quote = quoteBySymbol.get(item.symbol);
    return quote ? [quote] : [];
  });
}
