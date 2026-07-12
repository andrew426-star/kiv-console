import { getMarketQuotes } from "@/lib/market/finnhub";
import { cn } from "@/lib/utils";

export async function MarketTicker() {
  const quotes = await getMarketQuotes();
  if (quotes.length === 0) return null;

  const items = [...quotes, ...quotes];

  return (
    <div className="overflow-hidden border-b border-border/50 bg-kv-surface/60 py-1.5">
      <div className="flex w-max animate-ticker gap-8 px-6">
        {items.map((q, i) => (
          <span
            key={`${q.symbol}-${i}`}
            className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap"
          >
            <span className="text-muted-foreground">{q.label}</span>
            <span className="tabular-nums">{q.price.toFixed(2)}</span>
            <span
              className={cn(
                "tabular-nums",
                q.change >= 0 ? "text-kv-mint" : "text-destructive",
              )}
            >
              {q.change >= 0 ? "▲" : "▼"} {Math.abs(q.changePercent).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MarketTickerSkeleton() {
  return <div className="h-8 border-b border-border/50 bg-kv-surface/60" />;
}
