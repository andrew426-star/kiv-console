import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestBrief } from "@/lib/research/queries";

export async function ResearchSnapshot() {
  const brief = await getLatestBrief();

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-heading">Research</CardTitle>
        <Link href="/research" className="text-xs text-muted-foreground hover:text-foreground">
          Full brief →
        </Link>
      </CardHeader>
      <CardContent>
        {brief ? (
          <>
            <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-wrap">
              {brief.content}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Generated {new Date(brief.generatedAt).toLocaleString()}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No brief generated yet — visit Research.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
