import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteButton } from "@/components/company/delete-button";
import { LaunchScoreboard } from "@/components/launch/launch-scoreboard";
import { LogActivityForm } from "@/components/launch/log-activity-form";
import { deleteLaunchActivity } from "@/lib/launch/actions";
import { getLaunchSnapshot } from "@/lib/launch/queries";
import {
  ACTIVITY_KIND_LABELS,
  LAUNCH_DATE,
  PHASES,
  SEGMENTS,
  SEGMENT_LABELS,
} from "@/lib/launch/plan";

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

async function LaunchContent() {
  const snapshot = await getLaunchSnapshot();

  if (!snapshot.ok) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-destructive">
          Launch tracker unavailable: {snapshot.error}. If the table is missing, apply
          supabase/migrations/20260928120000_launch_activity.sql.
        </CardContent>
      </Card>
    );
  }

  const { progress, recent, conversationsBySegment } = snapshot;

  return (
    <>
      <Card className="glow-border-hover">
        <CardContent className="pt-6">
          <LaunchScoreboard progress={progress} />
        </CardContent>
      </Card>

      <Card className="glow-border-hover">
        <CardHeader>
          <CardTitle className="font-heading">Log activity</CardTitle>
        </CardHeader>
        <CardContent>
          <LogActivityForm today={progress.today} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="glow-border-hover">
          <CardHeader>
            <CardTitle className="font-heading">Conversations by segment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            {SEGMENTS.map((segment) => (
              <div key={segment} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{SEGMENT_LABELS[segment]}</span>
                <span className="font-heading font-bold">
                  {conversationsBySegment[segment] ?? 0}
                </span>
              </div>
            ))}
            <div className="mt-2 flex justify-between gap-3 border-t border-border/60 pt-2">
              <span className="text-muted-foreground">Publicity actions</span>
              <span className="font-heading font-bold">{progress.counts.publicity}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Content published</span>
              <span className="font-heading font-bold">{progress.counts.content}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-border-hover lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing logged yet. Log your first conversation above, or tell Jarvis or any Slack
                agent about it.
              </p>
            ) : (
              recent.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-kv-surface/60 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{ACTIVITY_KIND_LABELS[entry.kind]}</Badge>
                      <span className="font-medium">{entry.company ?? "—"}</span>
                      {entry.contact ? (
                        <span className="text-xs text-muted-foreground">{entry.contact}</span>
                      ) : null}
                    </div>
                    {entry.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {entry.occurredOn}
                      {entry.segment ? ` · ${SEGMENT_LABELS[entry.segment]}` : ""} · logged by{" "}
                      {entry.loggedBy}
                    </p>
                  </div>
                  <DeleteButton
                    action={deleteLaunchActivity.bind(null, entry.id)}
                    confirmMessage="Delete this activity from the launch tracker?"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function LaunchPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Launch</h1>
        <p className="text-sm text-muted-foreground">
          Kivaro AI goes public on {LAUNCH_DATE}. Every conversation, pilot and commitment logged
          here, by you, Jarvis or the Slack agents, counts toward the phase targets.
        </p>
      </div>

      <Suspense fallback={<SectionSkeleton />}>
        <LaunchContent />
      </Suspense>

      <Card className="glow-border-hover">
        <CardHeader>
          <CardTitle className="font-heading">The plan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {PHASES.map((phase) => (
            <div key={phase.id} className="flex flex-col gap-1">
              <span className="font-heading text-sm font-bold">{phase.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {phase.start === phase.end ? phase.start : `${phase.start} → ${phase.end}`}
              </span>
              <p className="text-xs text-muted-foreground">{phase.goal}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
