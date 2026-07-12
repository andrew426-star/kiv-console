import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DIVISIONS } from "@/lib/agents/roster";

const STATS = [
  { label: "Sovereign Agents", value: "15" },
  { label: "Operating Divisions", value: "5" },
  { label: "Autonomous Operation", value: "24/7" },
  { label: "Built In-House", value: "100%" },
];

export default function AgentsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Agent Team</h1>
        <p className="text-sm text-muted-foreground">
          The 15 sovereign AI agents powering Kivaro AI operations, across 5 divisions. Reference
          roster mirrored from kivaroai.com/agents — not wired into K.I.V. yet, that&apos;s Phase 4.
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
                <p className="text-xs text-muted-foreground">{division.agents.length} agents</p>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {division.agents.map((agent) => (
                <div key={agent.id} className="rounded-md border border-border/60 bg-kv-surface/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-bold">{agent.name}</span>
                    <Badge variant="outline" style={{ color: division.color, borderColor: division.color }}>
                      {agent.role}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {agent.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
