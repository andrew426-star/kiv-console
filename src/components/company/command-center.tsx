import { getTaskStats } from "@/lib/company/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function CommandCenter() {
  const stats = await getTaskStats();

  const tiles = [
    { label: "Active projects", value: stats.activeProjects },
    { label: "Clients", value: stats.totalClients },
    { label: "Open tasks", value: stats.counts.todo + stats.counts.in_progress },
    { label: "Blocked", value: stats.counts.blocked },
    { label: "Completed", value: stats.counts.done },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
      {tiles.map((tile) => (
        <Card key={tile.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {tile.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{tile.value}</CardContent>
        </Card>
      ))}
    </div>
  );
}
