import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PlaceholderCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href?: string;
}) {
  return (
    <Card className="border-dashed opacity-70 transition-opacity hover:opacity-100">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading text-muted-foreground">{title}</CardTitle>
        <Badge variant="outline">Not connected</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{description}</p>
        {href ? (
          <Link href={href} className="text-xs font-medium text-primary hover:underline">
            View section →
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
