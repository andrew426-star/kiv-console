import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LaunchScoreboard } from "@/components/launch/launch-scoreboard";
import { getLaunchSnapshot } from "@/lib/launch/queries";

export async function LaunchSnapshot() {
  const snapshot = await getLaunchSnapshot();

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Launch</CardTitle>
        <Link href="/launch" className="text-xs text-muted-foreground hover:text-foreground">
          Log activity →
        </Link>
      </CardHeader>
      <CardContent>
        {snapshot.ok ? (
          <LaunchScoreboard progress={snapshot.progress} />
        ) : (
          <p className="text-sm text-destructive">Launch tracker unavailable: {snapshot.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
