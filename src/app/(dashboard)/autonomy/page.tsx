import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { DiscoveryForm } from "@/components/ale/discovery-form";
import { LeadsTable } from "@/components/ale/leads-table";
import { getZohoConnectionSummary } from "@/lib/zoho/access-token";
import { isLeadStage } from "@/lib/ale/stage";

type SearchParams = Promise<{ error?: string; stage?: string }>;

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

// One line: whether Pipeline can actually send the drafted emails.
async function ZohoStatus({ searchParams }: { searchParams: SearchParams }) {
  const [{ error }, status] = await Promise.all([searchParams, getZohoConnectionSummary()]);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <span className="text-muted-foreground">Sending (Zoho Mail):</span>
      {status.connected ? (
        <Badge variant="outline" className="border-kv-mint/40 text-kv-mint">
          Connected as {status.emailAddress}
        </Badge>
      ) : (
        <>
          <Badge variant="outline" className="border-amber-400/60 text-amber-400">
            Not connected
          </Badge>
          <a href="/api/auth/zoho/connect" className={buttonVariants({ size: "xs" })}>
            Connect as andrew.thomas@kivaroai.com
          </a>
        </>
      )}
      {error ? <span className="text-destructive">Connection failed: {error}</span> : null}
    </div>
  );
}

async function Leads({ searchParams }: { searchParams: SearchParams }) {
  const { stage } = await searchParams;
  return <LeadsTable stage={isLeadStage(stage) ? stage : null} />;
}

export default function AutonomyPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Autonomy</h1>
        <p className="text-sm text-muted-foreground">
          The Autonomous Lead Engine — company discovery through AI-drafted outreach.
        </p>
      </div>

      <Card className="glow-border-hover">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-heading">Autonomous Lead Engine</CardTitle>
          <Badge variant="outline" className="border-kv-mint/40 text-kv-mint">
            All 3 stages live
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Discover → enrich contacts (Hunter) → research → draft a sales pitch, written straight
            into the real ALE spreadsheets. Each weekday morning, automation advances up to 5
            leads; use the buttons below to run a step now.{" "}
            <Link href="/agents" className="font-medium text-primary hover:underline">
              Pipeline
            </Link>{" "}
            sends the drafted emails.
          </p>
          <Suspense fallback={<Skeleton className="h-6 w-72" />}>
            <ZohoStatus searchParams={searchParams} />
          </Suspense>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Discover companies
            </span>
            <DiscoveryForm />
          </div>
        </CardContent>
      </Card>

      <Suspense fallback={<SectionSkeleton />}>
        <Leads searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
