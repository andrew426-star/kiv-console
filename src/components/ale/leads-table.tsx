import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLeads, type Lead } from "@/lib/ale/queries";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  countByStage,
  leadStage,
  type LeadStage,
} from "@/lib/ale/stage";
import { EnrichButton } from "./enrich-button";
import { ResearchButton } from "./research-button";
import { PitchButton } from "./pitch-button";

// The four steps a lead moves through, shown as a compact track instead of
// four table columns.
const STEPS: { label: string; done: (lead: Lead) => boolean }[] = [
  { label: "Contacts", done: (l) => l.contactCount > 0 },
  { label: "Research", done: (l) => l.researched },
  { label: "Draft", done: (l) => l.pitchCreated },
  { label: "Sent", done: (l) => l.pitched },
];

function StepTrack({ lead }: { lead: Lead }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {STEPS.map((step, i) => {
        const done = step.done(lead);
        return (
          <div key={step.label} className="flex items-center gap-1">
            {i > 0 ? (
              <span className={cn("h-px w-3", done ? "bg-kv-mint/60" : "bg-border")} />
            ) : null}
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px]",
                done ? "border-kv-mint/40 text-kv-mint" : "border-border text-muted-foreground/70",
              )}
            >
              {step.label === "Contacts" && done ? `${lead.contactCount} contacts` : step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function NextAction({ lead, stage }: { lead: Lead; stage: LeadStage }) {
  switch (stage) {
    case "enrich":
      return <EnrichButton placeId={lead.placeId} />;
    case "research":
      return <ResearchButton placeId={lead.placeId} />;
    case "pitch":
      return <PitchButton placeId={lead.placeId} />;
    case "drafted":
      return <span className="text-xs text-muted-foreground">Ready. Send via Pipeline</span>;
    case "sent":
      return (
        <span className="text-xs text-primary">
          Sent{lead.pitchSentAt ? ` ${new Date(lead.pitchSentAt).toLocaleDateString("en-US", { timeZone: "America/Chicago" })}` : ""}
        </span>
      );
    case "no_website":
      return <span className="text-xs text-muted-foreground">No website to enrich</span>;
  }
}

function StageFilter({
  counts,
  total,
  active,
}: {
  counts: Record<LeadStage, number>;
  total: number;
  active: LeadStage | null;
}) {
  const chip = (href: string, label: string, count: number, isActive: boolean) => (
    <Link
      key={label}
      href={href}
      scroll={false}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        isActive
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label} <span className="tabular-nums">{count}</span>
    </Link>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {chip("/autonomy", "All", total, active === null)}
      {LEAD_STAGES.filter((s) => counts[s] > 0).map((s) =>
        chip(`/autonomy?stage=${s}`, LEAD_STAGE_LABELS[s], counts[s], active === s),
      )}
    </div>
  );
}

export async function LeadsTable({ stage }: { stage: LeadStage | null }) {
  const result = await getLeads();

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Leads</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!result.connected ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Not connected. Connect Google to let ALE read/write the Geolocation Lead Engine
              spreadsheet.
            </p>
            <a
              href="/api/auth/google/connect"
              className={buttonVariants({ className: "w-fit", size: "sm" })}
            >
              Connect Google
            </a>
          </div>
        ) : "fetchError" in result ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">
              Connected, but the last fetch failed: {result.fetchError}
            </p>
            <p className="text-xs text-muted-foreground">
              If this mentions insufficient scope or invalid credentials, the connection needs to
              be re-authorized for Sheets/Docs/Drive access.
            </p>
            <a
              href="/api/auth/google/connect"
              className={buttonVariants({ variant: "outline", className: "w-fit", size: "sm" })}
            >
              Reconnect Google
            </a>
          </div>
        ) : result.leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No leads yet — run a discovery search above, or wait for tomorrow&apos;s 8am automatic
            run.
          </p>
        ) : (
          <LeadList leads={result.leads} stage={stage} />
        )}
      </CardContent>
    </Card>
  );
}

function LeadList({ leads, stage }: { leads: Lead[]; stage: LeadStage | null }) {
  const counts = countByStage(leads);
  const shown = stage ? leads.filter((l) => leadStage(l) === stage) : leads;

  return (
    <>
      <StageFilter counts={counts} total={leads.length} active={stage} />
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leads at this stage.</p>
      ) : (
        <div className="flex max-h-[40rem] flex-col divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60">
          {shown.map((lead) => {
            const s = leadStage(lead);
            return (
              <div
                key={lead.placeId}
                className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_auto_11rem] md:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{lead.name}</p>
                  <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="truncate">{lead.state || lead.address}</span>
                    {lead.rating ? <span>★ {lead.rating}</span> : null}
                    {lead.website ? (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="max-w-56 truncate text-primary hover:underline"
                      >
                        {lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                      </a>
                    ) : null}
                  </p>
                </div>
                <StepTrack lead={lead} />
                <div className="flex md:justify-end">
                  <NextAction lead={lead} stage={s} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
