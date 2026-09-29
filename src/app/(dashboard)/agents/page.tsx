import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DIVISIONS, findAgent } from "@/lib/agents/roster";
import { getActivitySnapshot } from "@/lib/agents/activity";
import { StatusBadge } from "@/components/agents/status-badge";
import { formatDateTime } from "@/lib/time";

const AGENT_COUNT = DIVISIONS.reduce((n, d) => n + d.agents.length, 0);

const STATS = [
  { label: "Launch Agents", value: String(AGENT_COUNT) },
  { label: "Operating Divisions", value: String(DIVISIONS.length) },
  { label: "Autonomous Operation", value: "24/7" },
  { label: "Built In-House", value: "100%" },
];

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

async function AgentsContent() {
  const { recent, lastActiveByAgent } = await getActivitySnapshot();

  return (
    <>
      <div className="flex flex-col gap-6">
        {DIVISIONS.map((division) => (
          <Card key={division.id} className="glow-border-hover">
            <CardHeader className="flex flex-row items-center gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-kv-surface/80 text-xs font-bold"
                style={{ color: division.color, borderColor: division.color }}
              >
                {division.id}
              </span>
              <div>
                <CardTitle className="font-heading">{division.label}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {division.agents.length} {division.agents.length === 1 ? "agent" : "agents"}
                </p>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {division.agents.map((agent) => {
                const lastActive = lastActiveByAgent.get(agent.id);
                return (
                  <div
                    key={agent.id}
                    className="rounded-md border border-border/60 bg-kv-surface/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-heading text-sm font-bold">{agent.name}</span>
                      <Badge
                        variant="outline"
                        style={{ color: division.color, borderColor: division.color }}
                      >
                        {agent.role}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      {agent.description}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground/70">
                      {lastActive
                        ? `Last active ${formatDateTime(lastActive.createdAt)}`
                        : "No activity yet"}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glow-border-hover">
        <CardHeader>
          <CardTitle className="font-heading">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No activity yet — agents aren&apos;t wired in. Once they are, every logged action
              shows up here.
            </p>
          ) : (
            recent.map((entry) => {
              const found = findAgent(entry.agentId);
              return (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-kv-surface/60 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{found?.agent.name ?? entry.agentId}</span>
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
              );
            })
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function AgentsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Agent Team</h1>
        <p className="text-sm text-muted-foreground">
          The {AGENT_COUNT} agents focused on Kivaro AI&apos;s January 2027 launch, each reachable in
          Slack. Every one can read and log to the <Link href="/launch" className="underline">launch
          tracker</Link>.
        </p>
      </div>

      <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map((stat) => (
          <Card
            key={stat.label}
            className="glow-border-hover animate-fade-up bg-kv-surface/60 backdrop-blur-sm"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="font-heading text-3xl font-bold text-gradient-green">
              {stat.value}
            </CardContent>
          </Card>
        ))}
      </div>

      <Suspense fallback={<SectionSkeleton />}>
        <AgentsContent />
      </Suspense>
    </div>
  );
}
