import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStripeFinancials } from "@/lib/portfolio/stripe";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export async function CompanyFinancials() {
  const result = await getStripeFinancials();

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Company Financials</CardTitle>
      </CardHeader>
      <CardContent>
        {!result.connected ? (
          <p className="text-sm text-muted-foreground">
            Not connected. Set STRIPE_SECRET_KEY (a Restricted API Key scoped read-only to
            Balance and Balance Transactions) to pull Kivaro AI&apos;s live Stripe balance and
            activity here.
          </p>
        ) : "fetchError" in result ? (
          <p className="text-sm text-destructive">
            Connected, but the last fetch failed: {result.fetchError}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Available</p>
                <p className="font-heading text-2xl font-bold text-gradient-green">
                  {formatCurrency(result.financials.availableBalance, result.financials.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Pending</p>
                <p className="font-heading text-2xl font-bold">
                  {formatCurrency(result.financials.pendingBalance, result.financials.currency)}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recent activity
              </p>
              {result.financials.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {result.financials.recentActivity.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                    >
                      <div>
                        <p className="font-medium">{tx.description ?? tx.type}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                          <Badge variant="secondary" className="text-[10px]">
                            {tx.type}
                          </Badge>
                        </div>
                      </div>
                      <span className={tx.amount >= 0 ? "text-kv-mint" : "text-destructive"}>
                        {tx.amount >= 0 ? "+" : ""}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
