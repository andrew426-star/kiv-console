"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runResearch } from "@/lib/ale/actions";

export function ResearchButton({ placeId }: { placeId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await runResearch(placeId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Research failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="xs" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "Researching…" : "Research & Extract"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
