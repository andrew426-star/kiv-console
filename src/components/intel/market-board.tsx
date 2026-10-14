import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getQuotesFor, type Quote } from "@/lib/market/finnhub";
import { cn } from "@/lib/utils";

// The broad market at a glance, above the hand-picked watchlist: indexes,
// energy, metals, rates and the dollar, global equity, crypto.
//
// Finnhub's plan here quotes stocks, ETFs and Binance crypto, but not
// futures, spot commodities or FX (those return 403). So each commodity,
// rate and currency is followed through the ETF that tracks it - natural
// gas through UNG, gold through GLD - and every tile says which. The day's
// % move leads, because it follows the asset; the price shown is the
// fund's, labelled so it is never read as the futures price. Crypto is
// quoted directly.

type Asset = { name: string; symbol: string; via?: string };

const GROUPS: { title: string; assets: Asset[] }[] = [
  {
    title: "Indexes",
    assets: [
      { name: "S&P 500", symbol: "SPY", via: "SPY" },
      { name: "Nasdaq 100", symbol: "QQQ", via: "QQQ" },
      { name: "Dow Jones", symbol: "DIA", via: "DIA" },
      { name: "Russell 2000", symbol: "IWM", via: "IWM" },
      { name: "Volatility (VIX)", symbol: "VIXY", via: "VIXY" },
    ],
  },
  {
    title: "Energy",
    assets: [
      { name: "Natural Gas", symbol: "UNG", via: "UNG" },
      { name: "WTI Crude", symbol: "USO", via: "USO" },
      { name: "Brent Crude", symbol: "BNO", via: "BNO" },
    ],
  },
  {
    title: "Metals & Ags",
    assets: [
      { name: "Gold", symbol: "GLD", via: "GLD" },
      { name: "Silver", symbol: "SLV", via: "SLV" },
      { name: "Copper", symbol: "CPER", via: "CPER" },
      { name: "Agriculture", symbol: "DBA", via: "DBA" },
    ],
  },
  {
    title: "Rates & Dollar",
    assets: [
      { name: "20Y+ Treasuries", symbol: "TLT", via: "TLT" },
      { name: "7-10Y Treasuries", symbol: "IEF", via: "IEF" },
      { name: "US Dollar", symbol: "UUP", via: "UUP" },
    ],
  },
  {
    title: "Global",
    assets: [
      { name: "Developed ex-US", symbol: "EFA", via: "EFA" },
      { name: "Emerging Markets", symbol: "EEM", via: "EEM" },
    ],
  },
  {
    title: "Crypto",
    assets: [
      { name: "Bitcoin", symbol: "BINANCE:BTCUSDT" },
      { name: "Ethereum", symbol: "BINANCE:ETHUSDT" },
      { name: "Solana", symbol: "BINANCE:SOLUSDT" },
    ],
  },
];

const MOVER_THRESHOLD_PERCENT = 2;

function price(value: number): string {
  return value >= 1000
    ? value.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Tile({ asset, quote }: { asset: Asset; quote?: Quote }) {
  const up = (quote?.change ?? 0) >= 0;
  const mover = quote && Math.abs(quote.changePercent) >= MOVER_THRESHOLD_PERCENT;
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-2 rounded-lg border border-border/60 bg-kv-surface/60 p-4",
        mover && "glow-border",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-heading text-sm font-semibold">{asset.name}</span>
        <span className="text-[11px] text-muted-foreground">{asset.via ? `via ${asset.via}` : "spot"}</span>
      </div>
      {quote ? (
        <>
          <span
            className={cn(
              "font-heading text-3xl font-bold tabular-nums leading-none",
              up ? "text-kv-mint" : "text-destructive",
            )}
          >
            {up ? "▲" : "▼"} {Math.abs(quote.changePercent).toFixed(2)}%
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {asset.via ? `${asset.via} ` : "$"}
            {price(quote.price)}
            {" · "}
            {up ? "+" : "−"}
            {price(Math.abs(quote.change))} today
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">No quote right now</span>
      )}
    </div>
  );
}

export async function MarketBoard() {
  const quotes = await getQuotesFor(GROUPS.flatMap((g) => g.assets.map((a) => ({ symbol: a.symbol, label: a.name }))));
  const bySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Markets</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Market quotes are unavailable right now.</p>
        ) : (
          GROUPS.map((group) => (
            <section key={group.title} className="flex flex-col gap-3">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{group.title}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {group.assets.map((asset) => (
                  <Tile key={asset.symbol} asset={asset} quote={bySymbol.get(asset.symbol)} />
                ))}
              </div>
            </section>
          ))
        )}
        <p className="text-xs text-muted-foreground">
          Commodities, rates and the dollar follow the ETF named on each tile; its price is the fund&apos;s,
          its % move tracks the asset. Crypto is spot. Quotes from Finnhub, refreshed every few minutes.
        </p>
      </CardContent>
    </Card>
  );
}
