import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WatchlistPanel } from "@/components/intel/watchlist-panel";
import { CategorizedNews } from "@/components/intel/categorized-news";

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

export default function IntelPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Intel Hub</h1>
        <p className="text-sm text-muted-foreground">
          Your live Interactive Brokers watchlist and curated Fintech/AI/Alts news.
        </p>
      </div>

      <Suspense fallback={<SectionSkeleton rows={4} />}>
        <WatchlistPanel />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <CategorizedNews />
      </Suspense>
    </div>
  );
}
