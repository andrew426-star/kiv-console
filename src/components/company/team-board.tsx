import { getTeamBoard } from "@/lib/company/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function TeamBoard() {
  const team = await getTeamBoard();

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Team Board</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {team.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members yet.</p>
        ) : (
          team.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between border-b pb-2 last:border-0"
            >
              <div>
                <p className="font-medium">{member.full_name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{member.active} active</Badge>
                <Badge variant="destructive">{member.blocked} blocked</Badge>
                <Badge variant="outline">{member.completed} done</Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
