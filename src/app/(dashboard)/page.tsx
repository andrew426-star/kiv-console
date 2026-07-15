import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CommandCenter } from "@/components/company/command-center";
import { NewsFeed } from "@/components/company/news-feed";
import { CalendarSnapshot } from "@/components/overview/calendar-snapshot";
import { MarketSnapshot } from "@/components/overview/market-snapshot";
import { ResearchSnapshot } from "@/components/overview/research-snapshot";
import { AutonomySnapshot } from "@/components/overview/autonomy-snapshot";
import { InboxSnapshot } from "@/components/overview/inbox-snapshot";
import { PlaceholderCard } from "@/components/overview/placeholder-card";

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

export default function Home() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">K.I.V.</h1>
        <p className="text-sm text-muted-foreground">
          Kivaro Intelligence Vectoring — the home base.
        </p>
      </div>

      <Suspense fallback={<SectionSkeleton rows={1} />}>
        <CommandCenter />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Suspense fallback={<SectionSkeleton />}>
          <CalendarSnapshot />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <MarketSnapshot />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ResearchSnapshot />
        </Suspense>
      </div>

      <Suspense fallback={<SectionSkeleton />}>
        <NewsFeed />
      </Suspense>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <PlaceholderCard
          title="Security"
          description="Ultron will monitor Kivaro's own infrastructure — Railway, Vercel, Supabase, GitHub — here once it's built."
          href="/security"
        />
        <Suspense fallback={<SectionSkeleton />}>
          <AutonomySnapshot />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <InboxSnapshot />
        </Suspense>
      </div>
    </div>
  );
}
