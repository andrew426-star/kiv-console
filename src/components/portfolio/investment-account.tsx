import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAlpacaPortfolio } from "@/lib/portfolio/alpaca";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export async function InvestmentAccount() {
  const result = await getAlpacaPortfolio();

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Investment Account</CardTitle>
      </CardHeader>
      <CardContent>
        {!result.connected ? (
          <p className="text-sm text-muted-foreground">
            Not connected. Set ALPACA_API_KEY_ID and ALPACA_SECRET_KEY to pull live account
            balance and positions here — read-only, K.I.V. never places orders. Defaults to
            Alpaca&apos;s paper-trading endpoint until ALPACA_API_BASE_URL is pointed at the live
            API with live keys.
          </p>
        ) : "fetchError" in result ? (
          <p className="text-sm text-destructive">
            Connected, but the last fetch failed: {result.fetchError}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Portfolio value
                </p>
                <p className="font-heading text-2xl font-bold text-gradient-green">
                  {formatCurrency(result.portfolio.account.portfolioValue)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Cash</p>
                <p className="font-heading text-lg font-semibold">
                  {formatCurrency(result.portfolio.account.cash)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Buying power
                </p>
                <p className="font-heading text-lg font-semibold">
                  {formatCurrency(result.portfolio.account.buyingPower)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
                <Badge variant="secondary">{result.portfolio.account.status}</Badge>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Positions
              </p>
              {result.portfolio.positions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open positions.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Market value</TableHead>
                      <TableHead className="text-right">Unrealized P/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.portfolio.positions.map((p) => (
                      <TableRow key={p.symbol}>
                        <TableCell className="font-medium">{p.symbol}</TableCell>
                        <TableCell className="tabular-nums">{p.qty}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(p.currentPrice)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(p.marketValue)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums ${
                            p.unrealizedPL >= 0 ? "text-kv-mint" : "text-destructive"
                          }`}
                        >
                          {p.unrealizedPL >= 0 ? "+" : ""}
                          {formatCurrency(p.unrealizedPL)} ({p.unrealizedPLPercent.toFixed(2)}%)
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
