import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLatestBrief, isStale } from "@/lib/research/queries";
import { generateBrief, type Brief } from "@/lib/research/generate";
import { RegenerateButton } from "@/components/research/regenerate-button";
import { formatDateTime } from "@/lib/time";

async function ResearchContent() {
  let brief: Brief | null = await getLatestBrief();
  let generateError: string | null = null;

  if (!brief || isStale(brief.generatedAt)) {
    try {
      brief = await generateBrief();
    } catch (err) {
      generateError = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <Card className="glow-border-hover">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="font-heading">Daily Brief</CardTitle>
          {brief ? (
            <p className="text-xs text-muted-foreground">
              Generated {formatDateTime(brief.generatedAt)}
            </p>
          ) : null}
        </div>
        <RegenerateButton />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {brief ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{brief.content}</p>
        ) : (
          <p className="text-sm text-destructive">
            {generateError
              ? `Brief generation failed: ${generateError}`
              : "No brief yet — click Regenerate."}
          </p>
        )}
        {brief && generateError ? (
          <p className="text-xs text-destructive">
            Showing the last successful brief — today&apos;s automatic regeneration failed:{" "}
            {generateError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ResearchSkeleton() {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function ResearchPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-gradient-green">Research</h1>
        <p className="text-sm text-muted-foreground">
          An AI-written daily brief synthesizing your calendar, market movers, news, and weather.
        </p>
      </div>
      <Suspense fallback={<ResearchSkeleton />}>
        <ResearchContent />
      </Suspense>
    </div>
  );
}
