import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscoveryForm } from "@/components/ale/discovery-form";
import { LeadsTable } from "@/components/ale/leads-table";

function SectionSkeleton({ rows = 4 }: { rows?: number }) {
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

export default function AutonomyPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Autonomy</h1>
        <p className="text-sm text-muted-foreground">
          The Autonomous Lead Engine — company discovery through AI-drafted outreach.
        </p>
      </div>

      <Card className="glow-border-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading">Autonomous Lead Engine</CardTitle>
          <Badge variant="outline" className="border-kv-mint/40 text-kv-mint">
            Stage 1 live — Discovery &amp; Enrichment
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Discovery (Google Places) and Hunter.io enrichment write directly into the real
            Geolocation Lead Engine spreadsheet — this page is a live window into it, not a copy.
            The deep company-research and Sales Pitch stages are still being built.
          </p>
          <p className="text-sm text-muted-foreground">
            Monitored day-to-day by{" "}
            <Link href="/agents" className="font-medium text-primary hover:underline">
              Pipeline
            </Link>
            , the Lead Engine Manager on the Automation &amp; Dev Workshop division.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading">Discover companies</CardTitle>
          <DiscoveryForm />
        </CardHeader>
      </Card>

      <Suspense fallback={<SectionSkeleton />}>
        <LeadsTable />
      </Suspense>
    </div>
  );
}
