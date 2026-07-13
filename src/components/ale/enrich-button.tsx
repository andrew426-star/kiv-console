"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runEnrichment } from "@/lib/ale/actions";

export function EnrichButton({ placeId }: { placeId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await runEnrichment(placeId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Enrichment failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="xs" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "Enriching…" : "Enrich with Hunter"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
