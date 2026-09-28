import type { LaunchProgress } from "@/lib/launch/plan";

function Meter({ count, target }: { count: number; target: number }) {
  const pct = Math.min(100, Math.round((count / target) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Countdown, current phase and the three phase targets. Shared by the
// /launch page and the home-page snapshot.
export function LaunchScoreboard({ progress }: { progress: LaunchProgress }) {
  const { phase } = progress;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Days to launch</p>
          <p className="font-heading text-3xl font-bold text-gradient-green">
            {progress.daysToLaunch}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            Now: {phase.label}
            {phase.metric ? ` · ${phase.daysLeft} days left in phase` : ""}
          </p>
          <p className="text-sm">{phase.goal}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {progress.scoreboard.map((row) => (
          <div key={row.phase} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={
                  row.phase === phase.id ? "text-xs font-medium" : "text-xs text-muted-foreground"
                }
              >
                {row.label}: {row.metric}s
              </span>
              <span className="font-heading text-sm font-bold">
                {row.count}/{row.target}
              </span>
            </div>
            <Meter count={row.count} target={row.target} />
          </div>
        ))}
      </div>
    </div>
  );
}
