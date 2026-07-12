import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Security</h1>
        <p className="text-sm text-muted-foreground">
          Perimeter, credential, and compliance monitoring for Kivaro&apos;s own infrastructure.
        </p>
      </div>

      <Card className="glow-border-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-heading">Ultron</CardTitle>
          <Badge variant="outline">Not built yet</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Ultron is the planned security-monitoring service for Kivaro AI&apos;s own assets —
            Railway services, Vercel projects, Supabase, and the GitHub org. It checks perimeter
            exposure, credential hygiene (rotated keys, expired tokens, leaked secrets), and
            compliance posture on infrastructure Andrew owns — not third-party scanning.
          </p>
          <p className="text-sm text-muted-foreground">
            Once it&apos;s built (Phase 3 of the Kivaro AI ecosystem roadmap), it reports here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No data — Ultron isn&apos;t connected yet. This panel will show live findings
            (severity, affected asset, detected at) once it is.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
