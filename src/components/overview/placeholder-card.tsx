import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PlaceholderCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed opacity-70">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-muted-foreground">{title}</CardTitle>
        <Badge variant="outline">Not connected</Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
