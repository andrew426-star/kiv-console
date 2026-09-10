import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonVariants } from "@/components/ui/button";
import { DiscoveryForm } from "@/components/ale/discovery-form";
import { LeadsTable } from "@/components/ale/leads-table";
import { getZohoConnectionSummary } from "@/lib/zoho/access-token";

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

async function ZohoConnectionCard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ error }, status] = await Promise.all([searchParams, getZohoConnectionSummary()]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Zoho Mail — Pipeline&apos;s send capability</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error ? <p className="text-sm text-destructive">Connection failed: {error}</p> : null}
        {status.connected ? (
          <p className="text-sm text-muted-foreground">
            Connected as <span className="font-medium text-foreground">{status.emailAddress}</span> — Pipeline
            can send drafted outreach emails from this address.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Not connected. Connect Zoho Mail so Pipeline can actually send the drafted outreach
              emails below, signed &quot;Andrew Thomas, Kivaro AI&quot; — sign in as
              andrew.thomas@kivaroai.com when prompted.
            </p>
            <a href="/api/auth/zoho/connect" className={buttonVariants({ className: "w-fit" })}>
              Connect Zoho Mail
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function AutonomyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Autonomy</h1>
        <p className="text-sm text-muted-foreground">
          The Autonomous Lead Engine — company discovery through AI-drafted outreach.
        </p>
      </div>

      <Suspense fallback={<SectionSkeleton rows={2} />}>
        <ZohoConnectionCard searchParams={searchParams} />
      </Suspense>

      <Card className="glow-border-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading">Autonomous Lead Engine</CardTitle>
          <Badge variant="outline" className="border-kv-mint/40 text-kv-mint">
            All 3 stages live
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Discovery, Hunter.io enrichment, company research, and Sales Pitch doc generation all
            write directly into the real Geolocation Lead Engine, Autonomous Lead Engine, and
            Sales Pitch Log spreadsheets — this page is a live window into them, not a copy.
          </p>
          <p className="text-sm text-muted-foreground">
            A weekday automation advances up to 5 backlogged leads through enrichment, research,
            and a finished pitch doc each morning — the buttons below are for running any stage
            manually, out of turn.
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
