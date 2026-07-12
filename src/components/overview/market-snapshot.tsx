import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMarketQuotes } from "@/lib/market/finnhub";
import { cn } from "@/lib/utils";

export async function MarketSnapshot() {
  const quotes = await getMarketQuotes();

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Market</CardTitle>
        <Link href="/intel" className="text-xs text-muted-foreground hover:text-foreground">
          Intel Hub →
        </Link>
      </CardHeader>
      <CardContent>
        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not connected — set FINNHUB_API_KEY.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {quotes.map((q) => (
              <div
                key={q.symbol}
                className="flex flex-col rounded-md border border-border/60 bg-kv-surface/60 px-2.5 py-1.5"
              >
                <span className="text-xs text-muted-foreground">{q.label}</span>
                <span className="tabular-nums text-sm font-medium">{q.price.toFixed(2)}</span>
                <span
                  className={cn(
                    "tabular-nums text-xs",
                    q.change >= 0 ? "text-kv-mint" : "text-destructive",
                  )}
                >
                  {q.change >= 0 ? "▲" : "▼"} {Math.abs(q.changePercent).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
