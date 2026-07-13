"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { runSalesPitch } from "@/lib/ale/actions";

export function PitchButton({ placeId }: { placeId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await runSalesPitch(placeId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Sales pitch generation failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="xs" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? "Generating…" : "Generate Sales Pitch"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
