import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyFinancials } from "@/components/portfolio/company-financials";
import { InvestmentAccount } from "@/components/portfolio/investment-account";
import { TradingSignals } from "@/components/portfolio/trading-signals";

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function PortfolioPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Company financials (Stripe) and the company&apos;s investment account (Alpaca) — both
          read-only. Trading itself happens on Alpaca&apos;s site or its TradingView broker panel,
          not here.
        </p>
      </div>

      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <CompanyFinancials />
      </Suspense>

      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <InvestmentAccount />
      </Suspense>

      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <TradingSignals />
      </Suspense>
    </div>
  );
}
