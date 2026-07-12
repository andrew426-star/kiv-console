import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PIPELINE_STAGES = [
  {
    stage: "Discover",
    detail: "Google Geocoding/Places identifies target companies and locations by criteria.",
  },
  {
    stage: "Enrich",
    detail: "Hunter.io resolves company and contact details — verified emails, roles, domains.",
  },
  {
    stage: "Draft",
    detail: "AI-drafted outreach tailored to each contact, held for review before sending.",
  },
  {
    stage: "Log",
    detail: "Every lead, enrichment result, and outreach attempt logged for follow-up.",
  },
];

export default function AutonomyPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Autonomy</h1>
        <p className="text-sm text-muted-foreground">
          The Autonomous Lead Engine&apos;s pipeline activity — company discovery through
          AI-drafted outreach.
        </p>
      </div>

      <Card className="glow-border-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading">Autonomous Lead Engine</CardTitle>
          <Badge variant="outline">Not built yet</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            ALE is the planned lead-generation pipeline: Google Geocoding/Places and Hunter.io
            find and enrich target companies and contacts, then draft outreach for review — all
            logged for follow-up. It&apos;s next up on the ecosystem roadmap.
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
        <CardHeader>
          <CardTitle className="font-heading">Planned pipeline</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PIPELINE_STAGES.map((step, i) => (
            <div key={step.stage} className="rounded-md border border-border/60 bg-kv-surface/60 p-3">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {i + 1}. {step.stage}
              </span>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Pipeline Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No data — ALE isn&apos;t connected yet. This panel will show live lead volume,
            enrichment results, and outreach status once it is.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
