import { getWatchlist } from "@/lib/intel/queries";
import { removeWatchlistItem } from "@/lib/intel/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddWatchlistForm } from "./add-watchlist-form";
import { cn } from "@/lib/utils";

const MOVER_THRESHOLD_PERCENT = 3;

export async function WatchlistPanel() {
  const items = await getWatchlist();

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Watchlist</CardTitle>
        <AddWatchlistForm />
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No symbols yet. Add one above — any Finnhub-recognized ticker works (equities like
            AAPL, or crypto like BINANCE:BTCUSDT).
          </p>
        ) : (
          items.map((item) => {
            const isMover = Math.abs(item.changePercent) >= MOVER_THRESHOLD_PERCENT;
            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between rounded-md border border-border/60 bg-kv-surface/60 p-3 text-sm",
                  isMover && "glow-border",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.label}</span>
                  {isMover ? (
                    <Badge variant={item.change >= 0 ? "secondary" : "destructive"}>
                      Mover {item.change >= 0 ? "▲" : "▼"}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{item.price.toFixed(2)}</span>
                  <span
                    className={cn(
                      "tabular-nums text-xs",
                      item.change >= 0 ? "text-kv-mint" : "text-destructive",
                    )}
                  >
                    {item.change >= 0 ? "▲" : "▼"} {Math.abs(item.changePercent).toFixed(2)}%
                  </span>
                  <form action={removeWatchlistItem.bind(null, item.id)}>
                    <Button type="submit" size="xs" variant="destructive">
                      Remove
                    </Button>
                  </form>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
