import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLeads, type Lead } from "@/lib/ale/queries";

function StageCounts({ leads }: { leads: Lead[] }) {
  const total = leads.length;
  const researched = leads.filter((l) => l.researched).length;
  const pitched = leads.filter((l) => l.pitched).length;
  const pending = total - pitched;

  return (
    <div className="grid grid-cols-4 gap-3">
      <div>
        <p className="text-xs text-muted-foreground">Discovered</p>
        <p className="font-heading text-xl font-bold">{total}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Researched</p>
        <p className="font-heading text-xl font-bold">{researched}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Pitched</p>
        <p className="font-heading text-xl font-bold text-gradient-green">{pitched}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Pending</p>
        <p className="font-heading text-xl font-bold">{pending}</p>
      </div>
    </div>
  );
}

export async function AutonomySnapshot() {
  const result = await getLeads();

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Autonomy</CardTitle>
        <Link href="/autonomy" className="text-xs text-muted-foreground hover:text-foreground">
          Full pipeline →
        </Link>
      </CardHeader>
      <CardContent>
        {!result.connected ? (
          <p className="text-sm text-muted-foreground">Not connected.</p>
        ) : "fetchError" in result ? (
          <p className="text-sm text-destructive">Last fetch failed: {result.fetchError}</p>
        ) : result.leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leads discovered yet.</p>
        ) : (
          <StageCounts leads={result.leads} />
        )}
      </CardContent>
    </Card>
  );
}
