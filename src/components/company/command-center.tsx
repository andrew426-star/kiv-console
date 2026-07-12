import { getTaskStats } from "@/lib/company/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export async function CommandCenter() {
  const stats = await getTaskStats();

  const tiles = [
    { label: "Active projects", value: stats.activeProjects },
    { label: "Clients", value: stats.totalClients },
    { label: "Open tasks", value: stats.counts.todo + stats.counts.in_progress },
    { label: "Blocked", value: stats.counts.blocked, warn: stats.counts.blocked > 0 },
    { label: "Completed", value: stats.counts.done },
  ];

  return (
    <div className="stagger-children grid grid-cols-2 gap-4 sm:grid-cols-5">
      {tiles.map((tile) => (
        <Card
          key={tile.label}
          className="glow-border-hover animate-fade-up bg-kv-surface/60 backdrop-blur-sm"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {tile.label}
            </CardTitle>
          </CardHeader>
          <CardContent
            className={cn(
              "font-heading text-3xl font-bold",
              tile.warn ? "text-destructive" : "text-gradient-green",
            )}
          >
            {tile.value}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
