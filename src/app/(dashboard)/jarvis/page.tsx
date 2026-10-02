import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getJarvisActivity } from "@/lib/agents/jarvis-activity";
import { StatusBadge } from "@/components/agents/status-badge";
import { formatDateTime } from "@/lib/time";

function SectionSkeleton({ rows = 6 }: { rows?: number }) {
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

async function JarvisActivity() {
  const entries = await getJarvisActivity();

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Jarvis Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No activity yet — nothing logged by Jarvis so far.
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-kv-surface/60 p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={entry.status} />
                  <span className="text-xs text-muted-foreground">{entry.action}</span>
                </div>
                {entry.detail ? (
                  <p className="mt-1 text-xs text-muted-foreground">{entry.detail}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDateTime(entry.createdAt)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function JarvisPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Jarvis</h1>
        <p className="text-sm text-muted-foreground">
          Andrew&apos;s separate personal assistant app — not one of K.I.V.&apos;s Slack agents, but
          able to DM them directly in Slack. Everything it does shows up here.
        </p>
      </div>

      <Suspense fallback={<SectionSkeleton />}>
        <JarvisActivity />
      </Suspense>
    </div>
  );
}
